import { MetricsName, TransportCategory } from '@app/constants/enum.contant';
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
// import * as sizeof from 'object-sizeof';
import { HelperServiceIp } from '@app/processors/helper/helper.service.ip';
import { isDevEnv } from '@app/app.env';
import { ChartList, SaveLogRequest } from '@app/protos/log';
import { createLogger } from '@app/utils/logger';
import * as dayjs from 'dayjs';
import { RpcException } from '@nestjs/microservices';
import { convertDatesToString } from '@app/utils/dateToString';

const logger = createLogger({ scope: 'LogService', time: true });

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
  ) {}

  onModuleInit() {
    this.checkAndDropIndex();
  }

  /**
   * 删除index
   * @memberof ApiLogService
   */
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
  public async create(data: SaveLogRequest): Promise<any> {
    const startNow = Date.now();
    // 站点放进缓存
    const site = await this.siteModel.findById(data.siteId);
    if (!site) {
      logger.error('站点已删除或者不存在');
      return '站点已删除或者不存在';
    }
    // 录屏上报信息
    if (data.category === TransportCategory.RV) {
      this.saveErrorRecord(data as any);
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
      };
      // TODO: ip查询地址比较耗时暂时去掉，后续替换其他查询服务, 这里还可以缓存起来，防止多次请求导致限流。
      log.ip_location =
        !isDevEnv && data.ip
          ? await this.ipService.queryLocation(data.ip)
          : null;
      logger.info(
        '上报数据:',
        JSON.stringify({ ...log, content: data?.content }),
      );
      try {
        switch (data.category) {
          case TransportCategory.EVENT: // 事件上报
            log.onModel = RefType.EventLog;
            log.doce = await this.eventLogService.create(
              data as unknown as EventLog,
            );
            break;
          case TransportCategory.API: // API上报
            log.onModel = RefType.ApiLog;
            log.doce = await this.apiLogService.create(
              data as unknown as ApiLog,
            );
            break;
          case TransportCategory.ERROR: // 错误上报
            log.onModel = RefType.ErrorLog;
            this.errorLogService.handleErrorAlert(data as unknown as ErrorLog);
            log.doce = await this.errorLogService.create(
              data as unknown as ErrorLog,
            );
            break;
          case TransportCategory.CUSTOM: // 自定义上报
            log.onModel = RefType.CustomLog;
            log.doce = await this.customLogService.create(
              data as unknown as CustomLog,
            );
            break;
          case TransportCategory.PV: // PV和UV上报
            log.onModel = RefType.PvLog;
            log.doce = await this.pvLogService.create(data as unknown as PvLog);
            break;
          case TransportCategory.PREF:
            if (log.reportsType == MetricsName.CDR) {
            }
            // 性能上报 perf
            log.onModel = RefType.PrefLog;
            log.doce = await this.prefLogService.create(
              data as unknown as PrefLog,
            );
            break;
          case TransportCategory.USER:
            await this.userLogService.create(data as unknown as UserLog);
            break;
        }
        if (!Object.is(data.category, TransportCategory.USER)) {
          const resp = data.response as any;
          if (resp) {
            // 防止打印数据量过大
            log.response = resp;
          }
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
  public paginate(
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
  public async cursorPaginate(query: PaginateQuery<Log>): Promise<any> {
    const { cursor, limit, sort, primaryKey, select, populate } = query;

    let findQuery = this.logModel.find(query) as any;

    if (select) {
      findQuery = findQuery.select(select);
    }

    if (populate) {
      findQuery = findQuery.populate(populate);
    }

    if (sort) {
      findQuery = findQuery.sort(sort);
    }

    // 如果有cursor,就从cursor之后开始查询
    if (cursor) {
      const lastItem = await this.logModel.findOne({
        id: cursor,
      });
      if (lastItem) {
        const compare = sort[primaryKey] === 1 ? 'gt' : 'lt';
        findQuery = findQuery
          .where(primaryKey)
          [compare](lastItem[primaryKey] as any);
      }
    }

    // 查询多一条用于判断是否还有下一页
    const docs = await findQuery.limit(limit + 1).exec();

    const hasNextPage = docs.length > limit;
    const items = hasNextPage ? docs.slice(0, -1) : docs;
    const nextCursor =
      hasNextPage && items.length > 0
        ? items[items.length - 1][primaryKey]
        : null;

    return {
      data: items || [],
      pagination: {
        hasNextPage,
        nextCursor,
      },
    };
  }

  /**
   * 根据站点ID删除相关站点
   * @param {MongooseID} siteId
   * @return {*}
   * @memberof PvLogService
   */
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
  public async batchDelete(ids: MongooseID[]): Promise<any> {
    const logResult = await this.logModel
      .deleteMany({ _id: { $in: ids } })
      .exec();
    return logResult;
  }

  /**
   * 聚合查询统计数据
   * @param {PipelineStage[]} pipeParams
   * @memberof LogService
   */
  public async aggregation(pipeParams: PipelineStage[]) {
    return this.logModel
      .aggregate(pipeParams)
      .then((data) => {
        const list = convertDatesToString(data);
        console.log(list, 'data--');
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
  public saveErrorRecord(data: any): any {
    return this.errorLogService.saveRecordData(data);
  }

  /**
   * 根据path或者url聚合分页数据
   * @param {PipelineStage[]} pipeParams
   * @param {PaginateOptions} paginateOptions
   * @return {*}
   * @memberof LogService
   */
  public aggregationPathOrUrl(
    pipeParams: PipelineStage[],
    paginateOptions: PaginateOptions,
  ): any {
    const aggregateQuery = this.logModel.aggregate(pipeParams);
    return this.logModel.aggregatePaginate(aggregateQuery, paginateOptions);
  }

  /**
   * 删除3天前的数据
   * @private
   * @memberof LogService
   */
  private deleteThirtyDayData = async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 3);
    const res = await this.logModel
      .deleteMany({ create_at: { $lt: thirtyDaysAgo } })
      .exec();
    logger.info('删除结果', res);
  };

  /**
   * 调度任务
   * @private
   * @memberof LogService
   */
  @Cron('0 */4 * * *') // 每小时凌晨
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
  public async handleOffsets(
    topicPartitions: TopicPartitionOffsetAndMetadata[],
  ) {
    // return await this.kafkaService.commitOffsets(topicPartitions);
  }

  public async handleMemoryData(
    query: PaginateQuery<Log>,
    option?: QueryOptions<any>,
  ) {
    return this.logModel.find(query, option).exec();
  }
}
