import { Controller } from '@nestjs/common';
import { PaginateOptions, PipelineStage } from 'mongoose';
import { ApiLogService } from './api.service';
import {
  groupHourOption,
  handleSearchKeys,
  projectHourOption,
} from '@app/utils/searchCommon';
import { GrpcMethod } from '@nestjs/microservices';

const KW_KEYS: Array<string> = ['path'];
const commonShow = {
  maxTime: 1,
  minTime: 1,
  avgTime: 1,
  count: 1,
  url: '$_id.url',
  statusTxt: '$_id.statusTxt',
  _id: 0,
};
const projectOption = projectHourOption({
  url: 1,
  timeLen: { $subtract: ['$responseTime', '$requestTime'] },
  statusTxt: {
    $cond: { if: { $gte: ['$status', 400] }, then: 'fail', else: 'success' },
  },
});

@Controller('apiLog')
export class ApiController {
  constructor(private readonly apiLogService: ApiLogService) {}

  @GrpcMethod('ApiLogService', 'getReuqestUrls')
  getReuqestUrls() {}

  /**
   * 聚合获取API信息
   * @param {any} query
   * @return {*}
   * @memberof ApiController
   */
  @GrpcMethod('ApiLogService', 'getReuqestUrls')
  getIpiList(query: any) {
    const { page, size } = query;
    const paginateOptions: PaginateOptions = { page: page, limit: size };
    const matchFilter = handleSearchKeys<any>(query, KW_KEYS);
    const isGreaterEight = query.timeSlot > 8 * 60 * 60 * 1000;
    const isOneDay = query.timeSlot === 24 * 60 * 60 * 1000;
    const groupOption = groupHourOption(
      {
        maxTime: { $max: '$timeLen' },
        minTime: { $min: '$timeLen' },
        avgTime: { $avg: '$timeLen' },
        count: { $sum: 1 },
      },
      isOneDay,
      {
        url: '$url',
        statusTxt: '$statusTxt',
      },
    );
    const dayPipe: PipelineStage[] = [
      { $match: matchFilter },
      { ...projectOption },
      { ...groupOption },
      {
        $project: { ...commonShow, startTime: '$_id.time', hour: '$_id.hour' },
      },
      { $sort: { startTime: -1, count: -1 } },
    ];
    const pipe: PipelineStage[] = [
      { $match: matchFilter },
      {
        $project: {
          create_at: 1,
          url: 1,
          timeLen: { $subtract: ['$responseTime', '$requestTime'] },
          statusTxt: {
            $cond: {
              if: { $gte: ['$status', 400] },
              then: 'fail',
              else: 'success',
            },
          },
        },
      },
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
            url: '$url',
            statusTxt: '$statusTxt',
          },
          maxTime: { $max: '$timeLen' },
          minTime: { $min: '$timeLen' },
          avgTime: { $avg: '$timeLen' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          ...commonShow,
          startTime: { $add: [new Date(0), '$_id.item'] },
        },
      },
      { $sort: { startTime: -1, count: -1 } },
    ];
    return this.apiLogService.aggregatePaginate(
      isGreaterEight ? dayPipe : pipe,
      paginateOptions,
    );
  }
}
