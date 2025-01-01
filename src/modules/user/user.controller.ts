import {
  groupHourOption,
  handleSearchKeys,
  projectHourOption,
} from '@app/utils/searchCommon';
import { Controller } from '@nestjs/common';
import { PaginateOptions, PaginateResult, PipelineStage } from 'mongoose';
import { UserLog } from './user.model';
import lodash from 'lodash';
import { UserLogService } from './user.service';
import { TransportCategory } from '@app/constants/enum.contant';
import { GrpcMethod } from '@nestjs/microservices';

const KW_KEYS: Array<string> = ['content', 'communityId'];

@Controller('userLog')
export class UserLogController {
  constructor(private readonly userLogService: UserLogService) {}

  @GrpcMethod('UserLogService', 'getErrorLogs')
  getErrorLogs(query: any): Promise<PaginateResult<UserLog>> {
    const { page, size, sort, ...filters } = query;
    const paginateOptions: PaginateOptions = { page, limit: size };
    const paginateQuery = handleSearchKeys<any>(query, KW_KEYS);
    paginateQuery.category = TransportCategory.USER;
    if (!lodash.isUndefined(sort)) {
      paginateOptions.sort = { _id: sort };
    } else {
      paginateOptions.sort = { _id: -1 };
    }
    paginateOptions.select = '-events -breadcrumbs -errorList';
    return this.userLogService.paginate(paginateQuery, paginateOptions);
  }

  @GrpcMethod('UserLogService', 'getErrorList')
  getErrorList(query: any) {
    const matchFilter = handleSearchKeys<any>(query, KW_KEYS);
    matchFilter.category = TransportCategory.USER;
    const isGreaterEight = query.timeSlot > 8 * 60 * 60 * 1000;
    const projectOption = projectHourOption({ value: 1 });
    const groupOption = groupHourOption(
      {
        valueList: { $addToSet: { value: 'value' } },
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
          count: 1,
          valueList: 1,
        },
      },
      { $sort: { startTime: 1 } },
    ];
    const pipe: PipelineStage[] = [
      { $match: matchFilter },
      {
        $group: {
          _id: {
            time: {
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
            value: '$value',
          },
          valueList: { $addToSet: { value: 'value' } },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          count: 1,
          valueList: 1,
          startTime: { $add: [new Date(0), '$_id.time'] },
        },
      },
      { $sort: { startTime: 1 } },
    ];
    return this.userLogService.aggregate(isGreaterEight ? dayPipe : pipe);
  }

  /**
   * 根据ID获取错误信息, 要放在最后
   * @param {QueryParamsResult} { params }
   * @memberof ErrorLogController
   */
  @GrpcMethod('UserLogService', 'getErrorInfo')
  getErrorInfo(params) {
    return this.userLogService.getIdByInfo(Number(params.id));
  }
}
