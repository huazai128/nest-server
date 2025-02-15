import {
  groupHourOption,
  handleSearchKeys,
  projectHourOption,
} from '@app/utils/searchCommon';
import { Controller } from '@nestjs/common';
import { PaginateOptions, PaginateResult, PipelineStage } from 'mongoose';
import { UserLog } from './user.model';
import { isUndefined } from 'lodash';
import { UserLogService } from './user.service';
import { TransportCategory } from '@app/constants/enum.contant';
import { GrpcMethod } from '@nestjs/microservices';

// 定义搜索关键字列表
const KW_KEYS: Array<string> = ['content', 'communityId'];

/**
 * 用户日志控制器
 */
@Controller('userLog')
export class UserLogController {
  constructor(private readonly userLogService: UserLogService) {}

  /**
   * 获取错误日志列表(分页)
   * @param query 查询参数
   * @returns 分页结果
   */
  @GrpcMethod('UserLogService', 'getErrorLogs')
  getErrorLogs(query: any): Promise<PaginateResult<UserLog>> {
    const { page, size, sort } = query;
    // 设置分页选项
    const paginateOptions: PaginateOptions = {
      page,
      limit: size,
      sort: !isUndefined(sort) ? { _id: sort } : { _id: -1 },
      select: '-events -breadcrumbs -errorList', // 排除不需要的字段
    };

    // 构建查询条件
    const paginateQuery = {
      ...handleSearchKeys<any>(query, KW_KEYS),
      category: TransportCategory.USER,
    };

    return this.userLogService.paginate(paginateQuery, paginateOptions);
  }

  /**
   * 获取错误列表(聚合统计)
   * @param query 查询参数
   * @returns 聚合结果
   */
  @GrpcMethod('UserLogService', 'getErrorList')
  getErrorList(query: any) {
    // 构建基础查询条件
    const matchFilter = {
      ...handleSearchKeys<any>(query, KW_KEYS),
      category: TransportCategory.USER,
    };

    const isGreaterEight = query.timeSlot > 8 * 60 * 60 * 1000;
    const isDayPeriod = query.timeSlot === 24 * 60 * 60 * 1000;

    // 按小时聚合的管道
    const dayPipe: PipelineStage[] = [
      { $match: matchFilter },
      projectHourOption({ value: 1 }),
      groupHourOption(
        {
          valueList: { $addToSet: { value: 'value' } },
          count: { $sum: 1 },
        },
        isDayPeriod,
      ),
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

    // 按时间段聚合的管道
    const periodPipe: PipelineStage[] = [
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

    return this.userLogService.aggregate(isGreaterEight ? dayPipe : periodPipe);
  }

  /**
   * 根据ID获取错误详情
   * @param params 包含id的参数对象
   * @returns 错误详情
   */
  @GrpcMethod('UserLogService', 'getErrorInfo')
  getErrorInfo(params) {
    return this.userLogService.getIdByInfo(Number(params.id));
  }
}
