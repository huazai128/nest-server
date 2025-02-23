import { Controller, Query } from '@nestjs/common';
import { PipelineStage } from 'mongoose';
import { PvLogService } from './pv.service';
import { handleSearchKeys } from '@app/utils/searchCommon';
import { GrpcMethod } from '@nestjs/microservices';

// 定义搜索关键字
const KW_KEYS: Array<string> = ['path'];

/**
 * PV/UV 统计控制器
 * 处理页面访问相关的统计数据
 */
@Controller('pv')
export class PvLogController {
  constructor(private readonly pvLogService: PvLogService) {}

  /**
   * 获取PV访问路径列表
   * @param query 查询参数
   * @returns 分页后的路径列表
   */
  @GrpcMethod('PvService', 'getPvPaths')
  getPvPaths(@Query() query: any) {
    const { page, size } = query;
    const paginateQuery = handleSearchKeys<any>(query, KW_KEYS);
    const paginateOptions = { page, limit: size };
    return this.pvLogService.getRoutePaths(paginateQuery, paginateOptions);
  }

  /**
   * 聚合PV/UV数据统计
   * @param query 查询参数,包含timeSlot时间片段
   * @returns 聚合后的PV/UV数据
   */
  @GrpcMethod('PvService', 'getErrorList')
  getErrorList(@Query() query: any) {
    const matchFilter = handleSearchKeys<any>(query, KW_KEYS);
    const isGreaterEight = query.timeSlot > 8 * 60 * 60 * 1000; // 8小时
    const isOneDay = query.timeSlot === 24 * 60 * 60 * 1000; // 24小时

    // 大于8小时的统计
    const pipe: PipelineStage[] = this.pvLogService.dayAggregate<
      PipelineStage[]
    >(matchFilter, isOneDay);
    pipe.push({ $sort: { startTime: 1 } });

    // 8小时以下时间片段统计
    const timeSlotPipe: PipelineStage[] = [
      { $match: matchFilter },
      {
        $project: {
          create_at: 1,
          userId: { $ifNull: ['$userId', '$ip'] }, // 用户ID不存在时使用IP
        },
      },
      {
        $group: {
          _id: {
            // 按时间片段分组
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
      {
        // 计算每个时间段的PV和UV
        $group: {
          _id: '$_id.time',
          pv: { $sum: '$count' },
          uv: { $sum: 1 },
        },
      },
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
   * 获取指定时间段的PV/UV统计数据
   * @param param0 开始时间,结束时间和其他查询参数
   * @returns 时间段内的PV/UV数据
   */
  @GrpcMethod('PvService', 'getSingleCount')
  getSingleCount(@Query() { startTime, endTime, ...query }: any) {
    const matchFilter = handleSearchKeys<any>(query, KW_KEYS);
    return this.pvLogService.getSingleDayData(matchFilter, {
      startTime,
      endTime,
    });
  }

  /**
   * 获取设备终端统计数据
   * @param param0 设备类型和查询参数
   * @returns 设备相关统计数据
   */
  @GrpcMethod('PvService', 'getTerminalStatistics')
  getTerminalStatistics(@Query() { type, ...query }: any) {
    const matchFilter = handleSearchKeys(query, KW_KEYS);
    return this.pvLogService.getTerminalDataOneDay(matchFilter, type);
  }

  /**
   * 获取访问路径统计数据
   * @param query 分页查询参数
   * @returns 分页后的路径统计数据
   */
  @GrpcMethod('PvService', 'getStatisticsPath')
  getStatisticsPath(@Query() query: any) {
    const { page, size } = query;
    const paginateQuery = handleSearchKeys<any>(query, KW_KEYS);
    const paginateOptions = { page, limit: size };
    return this.pvLogService.aggregateStatisticsPath(
      paginateQuery,
      paginateOptions,
    );
  }

  /**
   * 获取单日每小时的统计数据
   * @param param0 开始时间,结束时间和其他查询参数
   * @returns 每小时的统计数据
   */
  @GrpcMethod('PvService', 'getStatisticsSingleDayPath')
  getStatisticsSingleDayPath(@Query() { startTime, endTime, ...query }: any) {
    const matchFilter = handleSearchKeys<any>(query, KW_KEYS);
    return this.pvLogService.commonSingleDayData(matchFilter, {
      startTime,
      endTime,
    });
  }

  /**
   * 获取浏览器统计信息
   * @param param0 分页查询参数
   * @returns 分页后的浏览器统计数据
   */
  @GrpcMethod('PvService', 'getStatisticsEquipment')
  getStatisticsEquipment(@Query() { ...query }: any) {
    const { page, size } = query;
    const paginateQuery = handleSearchKeys<any>(query, KW_KEYS);
    const paginateOptions = { page, limit: size };
    return this.pvLogService.getBrowserInfo(paginateQuery, paginateOptions);
  }
}
