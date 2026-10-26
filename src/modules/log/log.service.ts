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
import { Record as RecordVideo } from '../record/record.model';
import { getSiteCacheKey } from '@app/constants/cache.contant';
import { RedisService } from '@app/processors/redis/redis.service';
import { NetworkSpeedLogService } from '../networkSpeedLog/networkSpeedLog.service';
import { NetworkSpeedLog } from '../networkSpeedLog/networkSpeedLog.model';
import { normalizeInboundSaveLog } from './logPayload.util';
import {
  mapLogDocToListItem,
  paginateResultToLogList,
} from './logQuery.util';
import { isDevEnv } from '@app/app.env';

const logger = createLogger({ scope: 'LogService', time: true });

export class PoisonMessageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PoisonMessageError';
  }
}

export class SiteNotFoundError extends PoisonMessageError {
  constructor(siteId: unknown) {
    super(`站点不存在或已删除: ${String(siteId)}`);
  }
}

export class UnsupportedCategoryError extends PoisonMessageError {
  constructor(category: unknown) {
    super(`上报类型缺失或不支持: ${String(category)}`);
  }
}

const categoryRefTypeMap: Partial<{ [key in TransportCategory]: RefType }> = {
  [TransportCategory.EVENT]: RefType.EventLog,
  [TransportCategory.API]: RefType.ApiLog,
  [TransportCategory.ERROR]: RefType.ErrorLog,
  [TransportCategory.CUSTOM]: RefType.CustomLog,
  [TransportCategory.PV]: RefType.PvLog,
  [TransportCategory.PREF]: RefType.PrefLog,
  [TransportCategory.USER]: RefType.UserLog,
};

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
    private readonly networkSpeedLogService: NetworkSpeedLogService,
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
    const normalized = normalizeInboundSaveLog(data);
    const startNow = isDevEnv ? Date.now() : 0;
    const site = await this.getSiteInfo(normalized.siteId);
    if (isDevEnv) {
      logger.info('站点信息获取耗时', `${Date.now() - startNow}ms`);
    }
    if (!site) {
      throw new SiteNotFoundError(normalized.siteId);
    }

    if (normalized.category === TransportCategory.RV) {
      await this.recordService.create(normalized as unknown as RecordVideo);
      if (isDevEnv) {
        logger.info('录屏保存耗时：', `${Date.now() - startNow}ms`);
      }
      return normalized;
    }

    const onModel =
      categoryRefTypeMap[normalized.category as TransportCategory];
    if (!onModel) {
      throw new UnsupportedCategoryError(normalized.category);
    }

    normalized.value = isObject(normalized.value)
      ? JSON.stringify(normalized.value)
      : (normalized.value as string);

    const log: Partial<Log> = {
      onModel,
      siteId: normalized.siteId as any,
      category: normalized.category as TransportCategory,
      userId: this.toSafeString(normalized.userId),
      title: this.toSafeString(normalized.title),
      path: this.toSafeString(normalized.path),
      href: this.toSafeString(normalized.href),
      method: this.toSafeString(normalized.method) as Log['method'],
      url: this.toSafeString(normalized.url),
      body: normalized.body && stringToObjectO(normalized.body),
      params: normalized.params && stringToObjectO(normalized.params),
      value: this.toSafeString(normalized.value),
      ip: this.toSafeString(normalized.ip),
      reportsType: normalized.reportsType as any,
      errorUUid: this.toSafeString(
        normalized.errorUUid || normalized.errorUid,
      ),
      meta: normalized.meta as any,
      traceId: this.toSafeString(normalized.traceId),
      monitorId: this.toSafeString(normalized.monitorId),
      pageId: this.toSafeString(normalized.pageId),
      totalSize: normalized.totalSize ?? 0,
      usedSize: normalized.usedSize ?? 0,
      limitSize: normalized.limitSize ?? 0,
      ua_result: (normalized as any).ua_result || normalized.uaResult,
      response: normalized.response as unknown as Log['response'],
    };

    let networkSpeedAlertData: NetworkSpeedLog | null = null;

    try {
      switch (normalized.category) {
        case TransportCategory.EVENT:
          log.doce = await this.eventLogService.create(
            normalized as unknown as EventLog,
          );
          break;
        case TransportCategory.API:
          log.doce = await this.apiLogService.create(
            normalized as unknown as ApiLog,
          );
          break;
        case TransportCategory.ERROR:
          this.errorLogService.handleErrorAlert(
            normalized as unknown as ErrorLog,
          );
          log.doce = await this.errorLogService.create(
            normalized as unknown as ErrorLog,
          );
          break;
        case TransportCategory.CUSTOM:
          if (this.networkSpeedLogService.isNetworkSpeedLog(normalized)) {
            const networkSpeedData = this.networkSpeedLogService.normalize(
              normalized as unknown as { [key: string]: any },
            );
            log.onModel = RefType.NetworkSpeedLog;
            log.doce =
              await this.networkSpeedLogService.create(networkSpeedData);
            networkSpeedAlertData = networkSpeedData;
          } else {
            log.doce = await this.customLogService.create(
              normalized as unknown as CustomLog,
            );
          }
          break;
        case TransportCategory.PV:
          log.doce = await this.pvLogService.create(
            normalized as unknown as PvLog,
          );
          break;
        case TransportCategory.PREF:
          log.doce = await this.prefLogService.create(
            normalized as unknown as PrefLog,
          );
          break;
        case TransportCategory.USER:
          await this.userLogService.create(normalized as unknown as UserLog);
          break;
      }

      if (
        normalized.category !== TransportCategory.USER &&
        !log.doce
      ) {
        throw new PoisonMessageError(
          `关联文档创建失败，category=${String(normalized.category)}`,
        );
      }

      if (normalized.category !== TransportCategory.USER) {
        await this.logModel.create(log);
      }

      if (
        networkSpeedAlertData &&
        this.networkSpeedLogService.shouldSendAlarm(networkSpeedAlertData)
      ) {
        void this.alarnService.sendNetworkSpeedAlarm(
          networkSpeedAlertData,
          site,
        );
      }

      if (isDevEnv) {
        logger.info('日志保存总耗时：', `${Date.now() - startNow}ms`);
      }
      return log;
    } catch (error) {
      logger.error(`上报错误`, JSON.stringify(normalized), error);
      this.alarnService.sendErrorSaveAlarm({
        content: error,
        siteId: normalized.siteId as unknown as ErrorLog['siteId'],
        userId: normalized.userId || undefined,
      });
      throw error;
    }
  }

  private toSafeString(value: unknown): string | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    return String(value);
  }

  public async saveLogFromChunkedPayload(data: SaveLogRequest): Promise<any> {
    return this.create(data);
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
  ) {
    const result = await this.logModel.paginate(
      paginateQuery,
      paginateOptions,
    );
    return paginateResultToLogList(result);
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
    const list = items.map((doc) => {
      const item = mapLogDocToListItem(doc as { [key: string]: any });
      const doce = (doc as any).doce;
      return {
        ...item,
        cId: doce?.id,
        tId: doce?._id,
      };
    });

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
    return this.logModel.find(query, undefined, option).exec();
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
