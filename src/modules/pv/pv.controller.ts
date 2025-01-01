import { Controller, Query } from '@nestjs/common';
import { PipelineStage } from 'mongoose';
import { PvLogService } from './pv.service';
import { handleSearchKeys } from '@app/utils/searchCommon';
import { GrpcMethod } from '@nestjs/microservices';

const KW_KEYS: Array<string> = ['path'];

@Controller('pv')
export class PvLogController {
  constructor(private readonly pvLogService: PvLogService) {}

  @GrpcMethod('PvService', 'getPvPaths')
  getPvPaths(@Query() query: any) {
    const { page, size } = query;
    const paginateQuery = handleSearchKeys<any>(query, KW_KEYS);
    const paginateOptions: any = { page: page, limit: size };
    return this.pvLogService.getRoutePaths(paginateQuery, paginateOptions);
  }

  /**
   * 聚合PV/UV数据
   * @param {any} query
   * @return {*}
   * @memberof PvLogController
   */
  @GrpcMethod('PvService', 'getErrorList')
  getErrorList(@Query() query: any) {
    const matchFilter = handleSearchKeys<any>(query, KW_KEYS);
    const isGreaterEight = query.timeSlot > 8 * 60 * 60 * 1000;
    const isOneDay = query.timeSlot === 24 * 60 * 60 * 1000;
    // 统计12小时和一天的pv、uv
    const pipe: PipelineStage[] = this.pvLogService.dayAggregate<
      PipelineStage[]
    >(matchFilter, isOneDay);
    pipe.push({ $sort: { startTime: 1 } });
    // 8小时以下时间片段, 时间片段下UV只取某一时间段的数据。
    const timeSlotPipe: PipelineStage[] = [
      { $match: matchFilter },
      { $project: { create_at: 1, userId: { $ifNull: ['$userId', '$ip'] } } },
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
            userId: '$userId',
          },
          count: { $sum: 1 },
        },
      },
      { $group: { _id: '$_id.time', pv: { $sum: '$count' }, uv: { $sum: 1 } } }, // 在根据时间统计某一时间段所有PV和UV
      {
        $project: {
          startTime: { $add: [new Date(0), '$_id'] },
          pv: 1,
          uv: 1,
          _id: 0,
        },
      },
      { $sort: { startTime: 1 } },
    ];
    return this.pvLogService.aggregate(isGreaterEight ? pipe : timeSlotPipe);
  }

  /**
   * 获取当天、昨天、7天前的pv/uv数据
   * @param {any} query
   * @return {*}
   * @memberof PvLogController
   */
  @GrpcMethod('PvService', 'getSingleCount')
  getSingleCount(@Query() { startTime, endTime, ...query }: any) {
    // 不传就查询当天
    const matchFilter = handleSearchKeys<any>(query, KW_KEYS);
    return this.pvLogService.getSingleDayData(matchFilter, {
      startTime,
      endTime,
    });
  }

  /**
   * 获取每天的设备相关数据
   * @memberof PvLogController
   */
  @GrpcMethod('PvService', 'getTerminalStatistics')
  getTerminalStatistics(@Query() { type, ...query }: any) {
    const matchFilter = handleSearchKeys(query, KW_KEYS);
    return this.pvLogService.getTerminalDataOneDay(matchFilter, type);
  }

  /**
   * 获取每天的设备相关数据
   * @memberof PvLogController
   */
  @GrpcMethod('PvService', 'getStatisticsPath')
  getStatisticsPath(@Query() query: any) {
    const { page, size } = query;
    const paginateQuery = handleSearchKeys<any>(query, KW_KEYS);
    const paginateOptions: any = { page: page, limit: size };
    return this.pvLogService.aggregateStatisticsPath(
      paginateQuery,
      paginateOptions,
    );
  }

  /**
   * 获取一天中每小时下的数据量
   * @memberof PvLogController
   */
  @GrpcMethod('PvService', 'getStatisticsSingleDayPath')
  getStatisticsSingleDayPath(@Query() { startTime, endTime, ...query }: any) {
    // 不传就查询当天
    const matchFilter = handleSearchKeys<any>(query, KW_KEYS);
    return this.pvLogService.commonSingleDayData(matchFilter, {
      startTime,
      endTime,
    });
  }
  /**
   * 统计浏览器信息
   * @memberof PvLogController
   */
  @GrpcMethod('PvService', 'getStatisticsSingleDayPath')
  getStatisticsEquipment(@Query() { ...query }: any) {
    const { page, size } = query;
    const paginateQuery = handleSearchKeys<any>(query, KW_KEYS);
    const paginateOptions: any = { page: page, limit: size };
    return this.pvLogService.getBrowserInfo(paginateQuery, paginateOptions);
  }
}
