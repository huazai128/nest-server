import { handleSearchKeys } from '@app/utils/searchCommon';
import { Controller } from '@nestjs/common';
import { PaginateOptions, PaginateResult } from 'mongoose';
import { CustomLog } from './customLog.model';
import lodasd from 'lodash';
import { CustomLogService, KW_KEYS } from './customLog.service';
import { GrpcMethod } from '@nestjs/microservices';

@Controller('custom')
export class CustomLogController {
  constructor(private readonly customLogService: CustomLogService) {}

  /**
   * 分页获取数据
   * @param {any} query
   * @return {*}  {Promise<PaginateResult<CustomLog>>}
   * @memberof CustomLogController
   */
  @GrpcMethod('CustomLogService', 'getCustomLogs')
  getCustomLogs(query: any): Promise<PaginateResult<CustomLog>> {
    const { page, size, sort } = query;
    const paginateOptions: PaginateOptions = { page, limit: size };
    const paginateQuery = handleSearchKeys<any>(query, KW_KEYS);
    if (!lodasd.isUndefined(sort)) {
      paginateOptions.sort = { _id: sort };
    } else {
      paginateOptions.sort = { _id: -1 };
    }
    return this.customLogService.paginate(paginateQuery, paginateOptions);
  }

  /**
   * 获取事件日志图表
   * @param {any} query
   * @return {*}
   * @memberof CustomLogController
   */
  @GrpcMethod('CustomLogService', 'getCustomChartLogs')
  getCustomChartLogs(query: any) {
    return this.customLogService.aggregate(query);
  }

  /**
   * 根据上报ID 分类聚合聚合数据
   * @param {any} query
   * @return {*}
   * @memberof CustomLogController
   */
  @GrpcMethod('CustomLogService', 'getCustomGroupChartLogs')
  getCustomGroupChartLogs(query: any) {
    return this.customLogService.paginateAggregate(query);
  }
}
