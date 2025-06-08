import { TransportCategory } from '@app/constants/enum.contant';
import { MongooseID, MongooseModel } from '@app/interfaces/mongoose.interface';
import { PaginateQuery } from '@app/interfaces/paginate.interface';
import { InjectModel } from '@app/transformers/model.transform';
import { Injectable } from '@nestjs/common';
import {
  PipelineStage,
  PaginateOptions,
  PaginateResult,
  QueryOptions,
} from 'mongoose';
import { ApiLog } from '../api/api.model';
import { ApiLogService } from '../api/api.service';
import { CustomLog } from '../customLog/customLog.model';
import { CustomLogService } from '../customLog/customLog.service';
import { ErrorLog } from '../error/error.model';
import { ErrorLogService } from '../error/error.service';
import { EventLog } from '../eventLog/eventLog.model';
import { EventLogService } from '../eventLog/eventLog.service';
import { PrefLog } from '../perf/pref.model';
import { PrefService } from '../perf/pref.service';
import { PvLog } from '../pv/pv.model';
import { PvLogService } from '../pv/pv.service';
import { Site } from '../site/site.model';
import { Log, RefType } from './log.model';
import { UserLogService } from '../user/user.service';
import { UserLog } from '../user/user.model';
import { isObject } from 'lodash';
import { stringToObjectO } from '@app/transformers/value.transform';
import { HelperServiceAlarn } from '@app/processors/helper/helper.service.alarm';
// import { KafkaService } from '@app/processors/kafka/kafka.service';
import { TopicPartitionOffsetAndMetadata } from '@nestjs/microservices/external/kafka.interface';
import { Cron } from '@nestjs/schedule';
import { HelperServiceIp } from '@app/processors/helper/helper.service.ip';
import { ChartList, SaveLogRequest } from '@app/protos/log';
import { createLogger } from '@app/utils/logger';
import * as dayjs from 'dayjs';
import { RpcException } from '@nestjs/microservices';
import { convertDatesToString } from '@app/utils/dateToString';
import { MeasureAsyncTime } from '@app/decorators/async.decorator';
import { RecordService } from '../record/record.service';
import { Record } from '../record/record.model';
import { getSiteCacheKey } from '@app/constants/cache.contant';
import { RedisService } from '@app/processors/redis/redis.service';

const logger = createLogger({ scope: 'LogService', time: true });

/**
 * 日志服务
 * @export
 * @class LogService
 */
@Injectable()
export class LogService {
  constructor(
    @InjectModel(Log) private readonly logModel: MongooseModel<Log>,
    @InjectModel(Site) private readonly siteModel: MongooseModel<Site>, // 避免循环依赖
    private readonly apiLogService: ApiLogService,
    private readonly eventLogService: EventLogService,
    private readonly errorLogService: ErrorLogService,
    private readonly customLogService: CustomLogService,
    private readonly pvLogService: PvLogService,
    private readonly prefLogService: PrefService,
    private readonly ipService: HelperServiceIp,
    private readonly userLogService: UserLogService,
    private readonly alarnService: HelperServiceAlarn,
    private readonly recordService: RecordService,
    private readonly cacheService: RedisService,
  ) {}

  onModuleInit() {
    this.checkAndDropIndex();
  }

  /**
   * 删除index
   * @memberof ApiLogService
   */
  @MeasureAsyncTime()
  async checkAndDropIndex() {
    try {
      const indexNames = [
        'meta.response.result_1',
        'response.result_1',
        'response_1',
      ];
      for (const indexName of indexNames) {
        try {
          const result = await this.logModel.collection.dropIndex(indexName);
          logger.info('index 删除成功:', result);
        } catch (error) {
          logger.info('index 不存在');
        }
      }
    } catch (error) {
      logger.error('检测或者删除index 错误:', error);
    }
  }

  /**
   * 上报信息
   * @param {SaveLogRequest} data
   * @return {*}  {Promise<any>}
   * @memberof LogService
   */
  @MeasureAsyncTime()
  public async create(data: SaveLogRequest): Promise<any> {
    const startNow = Date.now();
    // 站点放进缓存
    const site = await this.getSiteInfo(data.siteId);
    logger.info('站点信息获取耗时', `${Date.now() - startNow}ms`);
    if (!site) {
      logger.error('站点已删除或者不存在');
      return '站点已删除或者不存在';
    }
    // 录屏上报信息
    if (data.category === TransportCategory.RV) {
      this.recordService.create(data as unknown as Record); // 录屏上报 done
      logger.info('录屏保存耗时：', `${Date.now() - startNow}ms`);
      return data;
    } else {
      data.value = isObject(data.value)
        ? JSON.stringify(data.value)
        : data.value;
      const log: Partial<any> = {
        siteId: data.siteId,
        category: data.category,
        userId: data.userId,
        title: data.title,
        path: data.path,
        href: data.href,
        method: data.method,
        url: data.url,
        body: data.body && stringToObjectO(data.body),
        params: data.params && stringToObjectO(data.params),
        value: data.value,
        ip: data.ip,
        reportsType: data.reportsType,
        meta: data.meta,
        traceId: data.traceId,
        monitorId: data.monitorId,
        pageId: data.pageId,
      };
      try {
        switch (data.category) {
          case TransportCategory.EVENT: // 事件上报 done
            log.onModel = RefType.EventLog;
            log.doce = await this.eventLogService.create(
              data as unknown as EventLog,
            );
            break;
          case TransportCategory.API: // API上报 done
            log.onModel = RefType.ApiLog;
            log.doce = await this.apiLogService.create(
              data as unknown as ApiLog,
            );
            break;
          case TransportCategory.ERROR: // 错误上报 done
            log.onModel = RefType.ErrorLog;
            this.errorLogService.handleErrorAlert(data as unknown as ErrorLog);
            log.doce = await this.errorLogService.create(
              data as unknown as ErrorLog,
            );
            break;
          case TransportCategory.CUSTOM: // 自定义上报、react上报
            log.onModel = RefType.CustomLog;
            log.doce = await this.customLogService.create(
              data as unknown as CustomLog,
            );
            break;
          case TransportCategory.PV: // PV和UV上报 done
            log.onModel = RefType.PvLog;
            log.doce = await this.pvLogService.create(data as unknown as PvLog);
            break;
          case TransportCategory.PREF: // 性能上报 done
            // 性能上报 perf
            log.onModel = RefType.PrefLog;
            log.doce = await this.prefLogService.create(
              data as unknown as PrefLog,
            );
            break;
          case TransportCategory.USER: // 用户反馈上报 done
            await this.userLogService.create(data as unknown as UserLog);
            break;
        }
        if (!Object.is(data.category, TransportCategory.USER)) {
          this.logModel.create(log);
        }
        logger.info('日志保存总耗时：', `${Date.now() - startNow}ms`);
        return log;
      } catch (error) {
        logger.error(`上报错误`, JSON.stringify(data), error);
        this.alarnService.sendErrorSaveAlarm({
          content: error,
          siteId: data.siteId as unknown as ErrorLog['siteId'],
          userId: data.userId || undefined,
        });
        return error;
      }
    }
  }

  /**
   * 获取上报列表
   * @param {PaginateQuery<Log>} paginateQuery
   * @param {PaginateOptions} paginateOptions
   * @return {*}  {Promise<PaginateResult<Log>>}
   * @memberof LogService
   */
  @MeasureAsyncTime()
  public async paginate(
    paginateQuery: PaginateQuery<Log>,
    paginateOptions: PaginateOptions,
  ): Promise<PaginateResult<Log>> {
    return this.logModel.paginate(paginateQuery, paginateOptions);
  }

  /**
   * 获取上报列表游标分页
   * @param {PaginateQuery<Log>} paginateQuery
   * @param {PaginateOptions} paginateOptions
   * @return {*}  {Promise<PaginateResult<Log>>}
   * @memberof LogService
   */
  @MeasureAsyncTime()
  public async cursorPaginate(query: PaginateQuery<Log>): Promise<any> {
    const { cursor, limit, sort, primaryKey, select, populate, ...filters } =
      query;

    // 1. 使用投影优化
    const projection = select
      ? select.split(' ').reduce((acc, field) => {
          acc[field] = 1;
          return acc;
        }, {})
      : {};

    // 2. 构建高效的查询条件
    const queryConditions = { ...filters };
    if (cursor) {
      queryConditions[primaryKey] =
        sort?.[primaryKey] === 1 ? { $gt: cursor } : { $lt: cursor };
    }

    // 3. 使用高效的查询方式并添加populate
    let queryBuilder = this.logModel
      .find(queryConditions)
      .select(projection)
      .sort(sort || { [primaryKey]: -1 })
      .limit(limit + 1);

    // 添加populate支持
    if (populate) {
      if (typeof populate === 'object' && populate.path) {
        queryBuilder = queryBuilder.populate(populate);
      } else if (typeof populate === 'string') {
        queryBuilder = queryBuilder.populate(populate);
      }
    }

    const docs = await queryBuilder.lean().exec();

    // 4. 处理结果
    const hasNextPage = docs.length > limit;
    const items = hasNextPage ? docs.slice(0, -1) : docs;

    // 5. 优化数据转换
    const list = items.map(({ doce, create_at, update_at, ...rest }) => ({
      ...rest,
      ...(doce || {}),
      cId: doce?.id,
      tId: doce?._id,
      create_at: create_at
        ? dayjs(create_at).format('YYYY-MM-DD HH:mm:ss')
        : null,
      update_at: update_at
        ? dayjs(update_at).format('YYYY-MM-DD HH:mm:ss')
        : null,
    }));

    return {
      data: list,
      pagination: {
        hasNextPage,
        nextCursor:
          hasNextPage && items.length > 0
            ? items[items.length - 1][primaryKey]
            : null,
      },
    };
  }

  /**
   * 根据站点ID删除相关站点
   * @param {MongooseID} siteId
   * @return {*}
   * @memberof PvLogService
   */
  @MeasureAsyncTime()
  public async siteIdRemove(siteId: MongooseID): Promise<any> {
    const logResult = await this.logModel.deleteMany({ siteId: siteId }).exec();
    logger.info('删除站点', siteId, logResult);
    return logResult;
  }

  /**
   * 批量删除
   * @param {MongooseID[]} ids
   * @return {*}
   * @memberof PvLogService
   */
  @MeasureAsyncTime()
  public async batchDelete(ids: MongooseID[]): Promise<any> {
    const logResult = await this.logModel
      .deleteMany({ _id: { $in: ids } })
      .exec();
    return logResult;
  }

  /**
   * 确保索引
   * @memberof LogService
   */
  @MeasureAsyncTime()
  async ensureIndexes() {
    await this.logModel.createIndexes({
      create_at: 1,
      category: 1,
      reportsType: 1,
    } as any);
  }

  /**
   * 聚合查询统计数据
   * @param {PipelineStage[]} pipeParams
   * @memberof LogService
   */
  // 聚合查询统计数据
  @MeasureAsyncTime()
  public async aggregation(pipeParams: PipelineStage[]): Promise<ChartList> {
    return this.logModel
      .aggregate(pipeParams)
      .allowDiskUse(true) // 允许使用磁盘进行临时文件存储
      .then((data) => {
        const list = convertDatesToString(data);
        return { data: list } as unknown as ChartList;
      })
      .catch((err) => {
        logger.error('Log日志聚合查询错误', err);
        throw new RpcException({ message: 'Log日志聚合查询错误', err });
      });
  }
  /**
   *  报错错误录制
   * @param {RecordVideo} data
   * @return {*}
   * @memberof LogService
   */
  @MeasureAsyncTime()
  public async saveErrorRecord(data: any): Promise<any> {
    return this.errorLogService.saveRecordData(data);
  }

  /**
   * 根据path或者url聚合分页数据
   * @param {PipelineStage[]} pipeParams
   * @param {PaginateOptions} paginateOptions
   * @return {*}
   * @memberof LogService
   */
  @MeasureAsyncTime()
  public async aggregationPathOrUrl(
    pipeParams: PipelineStage[],
    paginateOptions: PaginateOptions,
  ): Promise<any> {
    const aggregateQuery = this.logModel.aggregate(pipeParams);
    return this.logModel.aggregatePaginate(aggregateQuery, paginateOptions);
  }

  /**
   * 删除3天前的数据
   * @private
   * @memberof LogService
   */
  @MeasureAsyncTime()
  private async deleteThirtyDayData() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 3);
    const res = await this.logModel
      .deleteMany({ create_at: { $lt: thirtyDaysAgo } })
      .exec();
    logger.info('删除结果', res);
  }

  /**
   * 调度任务
   * @private
   * @memberof LogService
   */
  @Cron('0 */4 * * *') // 每小时
  private handleScheduleJob() {
    logger.info('触发时间', dayjs().format('YYYY-MM-DD HH:mm:ss'));
    this.deleteThirtyDayData();
  }

  /**
   * 传入消息
   * @param {any} data
   * @memberof LogService
   */
  // public async kafkaSend(data: any) {
  //   const startNow = Date.now();
  //   if (data.category === TransportCategory.ERROR) {
  //     this.errorLogService.handleErrorAlert(data as unknown as ErrorLog);
  //   }
  //   try {
  //     const log: Partial<Log> = {
  //       siteId: data.siteId,
  //       category: data.category,
  //       userId: data.userId,
  //       title: data.title || '信托制物业小区',
  //       path: data.path,
  //       href: data.href,
  //       method: data.method,
  //       url: data.url,
  //       body: data.body && stringToObjectO(data.body),
  //       params: data.params && stringToObjectO(data.params),
  //       value: data.value,
  //       ip: data.ip,
  //       reportsType: data.reportsType,
  //       meta: data.meta && stringToObjectO(data.meta),
  //       traceId: data.traceId,
  //     };
  //     logger.info(
  //       'Kafka 发送前的数据',
  //       JSON.stringify({ ...log, content: data?.content }),
  //     );
  //     const sizeObj = sizeof(data);
  //     logger.info('上报数据大小为：单位字节', sizeObj);
  //     if (sizeObj > maxSize) {
  //       logger.info('数据过大直接保存：', sizeObj);
  //       this.create({ ...data, title: log.title || '信托制物业小区' });
  //     } else {
  //       this.kafkaService
  //         .sendMessage({ ...data, title: log.title || '信托制物业小区' })
  //         .subscribe((res) => {
  //           logger.info('kafka发送总耗时：', `${Date.now() - startNow}ms`);
  //           if (isString(res) && res == 'fail') {
  //             logger.info('Kafka 发送失败数据太大或者传输时间过长');
  //             this.create({ ...data, title: log.title || '信托制物业小区' });
  //           } else {
  //             logger.info('Kafka 发送成功了offset=');
  //           }
  //         });
  //     }
  //   } catch (error) {
  //     logger.error('发送前数据错误了', error);
  //   }
  // }

  /**
   * 处理偏移量
   * @param {TopicPartitionOffsetAndMetadata[]} topicPartitions
   * @return {*}
   * @memberof LogService
   */
  @MeasureAsyncTime()
  public async handleOffsets(
    topicPartitions: TopicPartitionOffsetAndMetadata[],
  ) {
    // 注释掉的代码：return await this.kafkaService.commitOffsets(topicPartitions);
    // 该方法用于处理Kafka消息的偏移量提交，目前未启用Kafka服务
    // 此方法目前为空实现，因为Kafka服务未启用
    return;
  }

  /**
   * 处理内存数据
   * @param {PaginateQuery<Log>} query
   * @param {QueryOptions<any>} option
   * @return {*}
   * @memberof LogService
   */
  @MeasureAsyncTime()
  public async handleMemoryData(
    query: PaginateQuery<Log>,
    option?: QueryOptions<any>,
  ) {
    return this.logModel.find(query, option).exec();
  }

  /**
   * 处理IP地址, 获取IP地址信息
   * @param {string} ip
   * @return {*}
   * @memberof LogService
   */
  @MeasureAsyncTime()
  public async hadnleIPLocation(ip: string) {
    try {
      const res = await this.ipService.queryLocation(ip);
      logger.info('handleIPLocation', res);
      // 确保返回非null值，防止TypeError: May not write null values to stream
      if (!res) {
        return {
          ip,
          country: '未知',
          country_code: '',
          province: '未知',
          region: '未知',
          region_code: '',
          city: '未知',
          zip: '',
          latitude: 0,
          longitude: 0,
        };
      }
      return {
        ip,
        ...res,
        province: res.region || '未知',
      };
    } catch (error) {
      logger.error('handleIPLocation error:', error);
      return {
        ip,
        country: '未知',
        country_code: '',
        province: '未知',
        region: '未知',
        region_code: '',
        city: '未知',
        zip: '',
        latitude: 0,
        longitude: 0,
      }; // 返回默认值，确保不影响grpc流程
    }
  }

  /**
   * 获取站点缓存键值
   * @param id 站点ID
   * @returns 缓存键值
   */
  private getCacheKey = (id: string): string => {
    return getSiteCacheKey(id);
  };

  /**
   * 获取站点信息
   * @param id 站点ID
   * @returns 站点信息
   */
  public async getSiteInfo(id?: string): Promise<Site | null> {
    if (!id) return null;
    // 尝试从缓存获取
    const cacheKey = this.getCacheKey(id);
    const siteInfoCache = await this.cacheService.get<Site>(cacheKey);
    if (siteInfoCache) {
      return siteInfoCache;
    }

    // 缓存未命中，从数据库获取并设置缓存
    const siteInfo = await this.siteModel.findById(id).exec();
    if (siteInfo) {
      await this.cacheService.set(cacheKey, siteInfo);
    }
    return siteInfo;
  }
}
