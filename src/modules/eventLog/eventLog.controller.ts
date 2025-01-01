import { Controller } from '@nestjs/common';
import { PaginateOptions, PaginateResult } from 'mongoose';
import { EventLog } from './eventLog.model';
import { EventLogService, KW_KEYS } from './eventLog.service';
import lodash from 'lodash';
import { handleSearchKeys } from '@app/utils/searchCommon';
import { GrpcMethod } from '@nestjs/microservices';

@Controller('event')
export class EventLogController {
  constructor(private readonly eventLogService: EventLogService) {}

  /**
   *
   * @param {any} query
   * @return {*}  {Promise<PaginateResult<EventLog>>}
   * @memberof EventLogController
   */

  @GrpcMethod('EventLogService', 'getEventLogs')
  getEventLogs(query: any): Promise<PaginateResult<EventLog>> {
    const { page, size, sort } = query;
    const paginateOptions: PaginateOptions = { page, limit: size };
    const paginateQuery = handleSearchKeys<any>(query, KW_KEYS);
    if (!lodash.isUndefined(sort)) {
      paginateOptions.sort = { _id: sort };
    } else {
      paginateOptions.sort = { _id: -1 };
    }
    return this.eventLogService.paginate(paginateQuery, paginateOptions);
  }

  /**
   * 获取事件日志图表
   * @param {any} query
   * @return {*}
   * @memberof EventLogController
   */
  @GrpcMethod('EventLogService', 'getEventChartLogs')
  getEventChartLogs(query: any) {
    return this.eventLogService.aggregate(query);
  }

  /**
   * 根据上报ID 分类聚合数据
   * @param {any} query
   * @return {*}  {Promise<PaginateResult<ChartItem>>}
   * @memberof EventLogController
   */
  @GrpcMethod('EventLogService', 'getCustomGroupChartLogs')
  getCustomGroupChartLogs(query: any) {
    return this.eventLogService.paginateAggregate(query);
  }
}
