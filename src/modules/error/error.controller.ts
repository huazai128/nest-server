import { Controller } from '@nestjs/common';
import {
  PaginateOptions,
  PaginateResult,
  PipelineStage,
  Types,
} from 'mongoose';
import { ErrorLog } from './error.model';
import { ErrorLogService } from './error.service';
import { isUndefined } from 'lodash';
import { handleSearchKeys } from '@app/utils/searchCommon';
import { GrpcMethod } from '@nestjs/microservices';

const KW_KEYS: Array<string> = [
  'title',
  'path',
  'href',
  'value',
  'meta.url',
  'meta.body',
  'meta.params',
  'meta.file',
];

@Controller('/api/error')
export class ErrorLogController {
  constructor(private readonly errorLogService: ErrorLogService) {}

  /**
   * 根据站点获取错误日志
   * @param {any} query
   * @return {*}  {Promise<PaginateResult<ErrorLog>>}
   * @memberof ErrorLogController
   */
  @GrpcMethod('ErrorService', 'getErrorLogs')
  getErrorLogs(query: any): Promise<PaginateResult<ErrorLog>> {
    const { page, size, sort, ...filters } = query;
    const paginateOptions: PaginateOptions = { page, limit: size };
    const paginateQuery = handleSearchKeys<any>(query, KW_KEYS);
    if (!isUndefined(sort)) {
      paginateOptions.sort = { _id: sort };
    } else {
      paginateOptions.sort = { _id: -1 };
    }
    if (filters.type) {
      paginateQuery.reportsType = filters.type;
    }
    return this.errorLogService.paginate(paginateQuery, paginateOptions);
  }

  /**
   * 统计错误信息
   * @param {any} query
   * @return {*}
   * @memberof ErrorLogController
   */
  @GrpcMethod('ErrorService', 'getErrorList')
  getErrorList(query: any) {
    const matchFilter = handleSearchKeys<any>(query, KW_KEYS);
    if (query.type) {
      matchFilter.reportsType = query.type;
    }
    const pipe: PipelineStage[] = this.errorLogService.handleAggragateData(
      matchFilter,
      query.timeSlot,
    );
    return this.errorLogService.aggregate([
      ...pipe,
      { $sort: { startTime: 1 } },
    ]);
  }

  /**
   * 统计错误总览
   * @param {any} query
   * @return {*}
   * @memberof ErrorLogController
   */
  @GrpcMethod('ErrorService', 'getErrorOverview')
  getErrorOverview(query: Pick<any, 'siteId'>) {
    return this.errorLogService.statisticsData(
      new Types.ObjectId(query.siteId),
    );
  }

  /**
   * 根据错误值统计
   * @param {(Pick<any, 'siteId' | 'page' | 'size'>)} query
   * @return {*}
   * @memberof ErrorLogController
   */
  @GrpcMethod('ErrorService', 'getErrorValues')
  getErrorValues(query: any) {
    const { page, size, siteId } = query;
    const paginateOptions: PaginateOptions = { page: page, limit: size };
    return this.errorLogService.statisticsValuesData(
      new Types.ObjectId(siteId),
      paginateOptions,
    );
  }

  /**
   * 统计单天数据，包含昨天以及7天前的数据
   * @param {any} { startTime, endTime, ...query }
   * @return {*}
   * @memberof ErrorLogController
   */
  @GrpcMethod('ErrorService', 'getErrorCount')
  getErrorCount({ startTime, endTime, ...query }: any) {
    const matchFilter = handleSearchKeys<any>(query, KW_KEYS);
    return this.errorLogService.commonSingleDayData(
      matchFilter,
      { startTime, endTime },
      true,
    );
  }

  /**
   * 聚合分页统计错误详情
   * @param {any} { page, size, ...query }
   * @return {*}
   * @memberof ErrorLogController
   */
  @GrpcMethod('ErrorService', 'getErrorStatisticsPaginate')
  getErrorStatisticsPaginate({ page, size, ...query }: any) {
    const matchFilter = handleSearchKeys<any>(query, KW_KEYS);
    const paginateOptions: PaginateOptions = { page: page, limit: size };
    return this.errorLogService.paginateErrorData(
      matchFilter,
      paginateOptions,
      query.reportsType,
    );
  }

  /**
   * 根据ID获取错误信息, 要放在最后
   * @param {QueryParamsResult} { params }
   * @memberof ErrorLogController
   */
  @GrpcMethod('ErrorService', 'getErrorInfo')
  getErrorInfo(params: any) {
    return this.errorLogService.getIdByInfo(Number(params.id));
  }
}
