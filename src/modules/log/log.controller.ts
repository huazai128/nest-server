import { Controller, UseInterceptors } from '@nestjs/common';
import { PaginateOptions, PaginateResult, PipelineStage } from 'mongoose';
import { KW_KEYS } from '@app/constants/value.constant';
import { LogService } from './log.service';
import { Log } from './log.model';
import { isUndefined, omitBy, isNil } from 'lodash';
import {
  groupHourOption,
  handleSearchKeys,
  projectHourOption,
} from '@app/utils/searchCommon';
import { GrpcMethod } from '@nestjs/microservices';
import { ChartList, LogList, SaveLogRequest } from '@app/protos/log';
import { LogChartQueryDTO, LogPaginateQueryDTO } from './log.dto';
import { plainToClass } from 'class-transformer';
import { LoggingInterceptor } from '@app/interceptors/logging.interceptor';
import { createLogger } from '@app/utils/logger';
import { getUaInfo } from '@app/utils/util';

const logger = createLogger({
  scope: 'LogController',
  time: true,
});

/**
 * 日志控制器
 * @export
 * @class LogController
 */
@Controller('log')
@UseInterceptors(LoggingInterceptor)
export class LogController {
  constructor(private readonly logService: LogService) {}

  /**
   * 上报日志
   * @return {*}
   * @memberof WeblogControll
   */
  @GrpcMethod('LogService', 'saveLog')
  async saveLog(data: SaveLogRequest) {
    const cleanedData = omitBy(data, isNil);
    //
    cleanedData.ua_result = getUaInfo(cleanedData.ua);
    logger.info(`日志接收数据${cleanedData.reportsType}`, cleanedData);
    return this.logService.create(cleanedData);
  }

  /**
   * 获取所有日志
   * @param {LogPaginateQueryDTO} params
   * @return {*}  {Promise<PaginateResult<Log>>}
   * @memberof LogController
   */
  @GrpcMethod('LogService', 'getLogs')
  getLogs(params: LogPaginateQueryDTO): Promise<PaginateResult<Log>> {
    const query = plainToClass(LogPaginateQueryDTO, params);
    const { page, size, sort, ...filters } = query;
    const paginateQuery = handleSearchKeys<LogPaginateQueryDTO>(query, KW_KEYS);
    if (query.category) {
      paginateQuery.category = query.category;
    }
    if (query.reportsType) {
      paginateQuery.reportsType = query.reportsType;
    }
    const paginateOptions: PaginateOptions = {
      page: page || 1,
      limit: size || 20,
    };
    if (!isUndefined(sort)) {
      paginateOptions.sort = { _id: sort };
    } else {
      paginateOptions.sort = { id: -1 };
    }
    if (filters.category) {
      paginateQuery.category = filters.category;
    }

    paginateOptions.select =
      '-href -path -title -value -_id -params -response -body -ip_location -meta -url';
    paginateOptions.populate = {
      path: 'doce',
      select:
        '-siteId -events -stackTrace -breadcrumbs -errorList -_id -create_at -update_at -onModel', //返回的数据过大导致，接口返回request content was evicted from inspector cache
    };

    return this.logService.paginate(paginateQuery, paginateOptions);
  }

  /**
   * 根据游标获取日志
   * @param {LogPaginateQueryDTO} data
   * @return {*}  {Promise<LogList>}
   * @memberof LogController
   */
  @GrpcMethod('LogService', 'getLogsByCursor')
  getLogsByCursor(data: LogPaginateQueryDTO): Promise<LogList> {
    const query = plainToClass(LogPaginateQueryDTO, data);
    const { cursor, size, sort, ...filters } = query;
    let paginateQuery = handleSearchKeys<any>(query, KW_KEYS);
    if (query.category) {
      paginateQuery.category = query.category;
    }
    if (query.reportsType) {
      paginateQuery.reportsType = query.reportsType;
    }
    if (filters.category) {
      paginateQuery.category = filters.category;
    }

    paginateQuery = {
      cursor: cursor,
      limit: size || 20,
      sort: !isUndefined(sort) ? { _id: sort } : { id: -1 },
      primaryKey: !isUndefined(sort) ? '_id' : 'id',
      select:
        '-href -path -title -value -params -response -body -ip_location -meta -url',
      populate: {
        path: 'doce',
        select:
          '-siteId -events -stackTrace -breadcrumbs -errorList -_id -create_at -update_at -onModel', //返回的数据过大导致，接口返回request content was evicted from inspector cache
      },
      ...paginateQuery,
    };

    return this.logService.cursorPaginate(paginateQuery);
  }

  /**
   * 获取日志图表数据
   * @param {LogChartQueryDTO} data
   * @return {*}  {Promise<ChartItem>}
   * @memberof LogController
   */
  @GrpcMethod('LogService', 'getLogsChart')
  @GrpcMethod('LogService', 'getLogsChart')
  async getLogsChart(data: LogChartQueryDTO): Promise<ChartList> {
    const query = plainToClass(LogChartQueryDTO, data);
    const matchFilter = handleSearchKeys<LogChartQueryDTO>(query, KW_KEYS);

    if (query.category) {
      matchFilter.category = query.category;
    }
    if (query.reportsType) {
      matchFilter.reportsType = query.reportsType;
    }

    const isGreaterEight = query.timeSlot > 8 * 60 * 60 * 1000;
    const projectOption = projectHourOption();
    const groupOption = groupHourOption(
      {
        count: { $sum: 1 },
      },
      query.timeSlot === 24 * 60 * 60 * 1000,
    );

    const dayPipe: PipelineStage[] = [
      { $match: matchFilter },
      { ...projectOption },
      { ...groupOption },
      {
        $project: {
          _id: 0,
          startTime: '$_id.time',
          hour: '$_id.hour',
          apiList: 1,
          count: 1,
        },
      },
      { $sort: { startTime: 1 } },
    ];

    const pipe: PipelineStage[] = [
      { $match: matchFilter },
      {
        $group: {
          _id: {
            $subtract: [
              { $subtract: ['$create_at', new Date(0)] },
              {
                $mod: [
                  { $subtract: ['$create_at', new Date(0)] },
                  query.timeSlot,
                ],
              },
            ],
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          count: 1,
          startTime: { $add: [new Date(0), '$_id'] },
        },
      },
      { $sort: { startTime: 1 } },
    ];

    // 使用批量处理优化查询
    const results = await this.logService.aggregation(
      isGreaterEight ? dayPipe : pipe,
    );
    return results;
  }
  /**
   * 根据不同类型分页聚合统计数据
   * @param {any} query
   * @return {*}  {Promise<any>}
   * @memberof WeblogControll
   */
  @GrpcMethod('LogService', 'getLogsAggregation')
  getLogsAggregation({ type, ...query }: any) {
    const paginateOptions: PaginateOptions = {
      page: query.page,
      limit: query.size,
    };
    const matchFilter = handleSearchKeys(query, KW_KEYS);
    if (query.category) {
      matchFilter.category = query.category;
    }
    if (query.reportsType) {
      matchFilter.reportsType = query.reportsType;
    }
    const pipe: PipelineStage[] = [
      { $match: matchFilter },
      {
        $group: {
          _id: type == 'api' ? '$url' : '$path',
          value: { $sum: 1 },
        },
      },
      { $project: { _id: 0, value: 1, name: '$_id', key: '$_id' } },
      { $sort: { value: -1 } },
    ];
    return this.logService.aggregationPathOrUrl(pipe, paginateOptions);
  }

  /**
   * 处理信息
   * @param {any} any
   * @param {KafkaContext} context
   * @memberof WeblogControll
   */
  // @MessagePattern(MONITOR_TOPIC)
  // async handleMessage(@Payload() any: any, @Ctx() context: KafkaContext) {
  //   const startNow = Date.now();
  //   const { offset } = context.getMessage();
  //   const heartbeat = context.getHeartbeat();
  //   const partition = context.getPartition();
  //   const topic = context.getTopic();
  //   await this.logService.handleOffsets([{ topic, partition, offset }]);
  //   this.logService.create(any);
  //   await heartbeat();
  //   logger.info('Kafka消费成功offset=', offset);
  //   logger.info('kafka消费总耗时：', `${Date.now() - startNow}ms`);
  //   return offset;
  // }

  @GrpcMethod('LogService', 'getMemoryData')
  getMemoryData({ ...query }: any) {
    const matchFilter = handleSearchKeys<any>(query, KW_KEYS);
    if (query.category) {
      matchFilter.category = query.category;
    }
    if (query.reportsType) {
      matchFilter.reportsType = query.reportsType;
    }
    const pipe: PipelineStage[] = [
      { $match: matchFilter },
      {
        $group: {
          _id: {
            $subtract: [
              { $subtract: ['$create_at', new Date(0)] },
              {
                $mod: [{ $subtract: ['$create_at', new Date(0)] }, 60 * 1000],
              },
            ],
          },
          // apiList: { $push: { create_at: '$create_at' } }, //查看时间段内的数据
          avgTotalSize: { $avg: { $divide: ['$totalSize', 1024 * 1024] } },
          avgUsedSize: { $avg: { $divide: ['$usedSize', 1024 * 1024] } },
          avgLimitSize: { $avg: { $divide: ['$limitSize', 1024 * 1024] } },
          maxTotalSize: { $max: { $divide: ['$totalSize', 1024 * 1024] } },
          maxUsedSize: { $max: { $divide: ['$usedSize', 1024 * 1024] } },
          maxLimitSize: { $max: { $divide: ['$limitSize', 1024 * 1024] } },
          minTotalSize: { $min: { $divide: ['$totalSize', 1024 * 1024] } },
          minUsedSize: { $min: { $divide: ['$usedSize', 1024 * 1024] } },
          minLimitSize: { $min: { $divide: ['$limitSize', 1024 * 1024] } },
        },
      },
      {
        $project: {
          _id: 0,
          avgTotalSize: 1,
          avgUsedSize: 1,
          avgLimitSize: 1,
          maxTotalSize: 1,
          maxUsedSize: 1,
          maxLimitSize: 1,
          minTotalSize: 1,
          minUsedSize: 1,
          minLimitSize: 1,
          startTime: { $add: [new Date(0), '$_id'] },
        },
      },
      { $sort: { startTime: 1 } },
    ];
    return this.logService.aggregation(pipe);
  }
}
