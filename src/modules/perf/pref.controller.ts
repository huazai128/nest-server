import { handleSearchKeys } from '@app/utils/searchCommon';
import { Controller } from '@nestjs/common';
import { PipelineStage } from 'mongoose';
import { PrefService } from './pref.service';
import { MetricsName } from '@app/constants/enum.contant';
import { GrpcMethod } from '@nestjs/microservices';

const KW_KEYS: Array<string> = ['path', 'reportsType'];

@Controller('pref')
export class PrefController {
  constructor(private readonly prefLogService: PrefService) {}

  @GrpcMethod('PrefService', 'getFmpChartList')
  getFmpChartList(query: any) {
    const matchFilter = handleSearchKeys<any>(query, KW_KEYS);
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
          maxFmp: { $max: '$fmpTime' },
          minFmp: { $min: '$fmpTime' },
          avgFmp: { $avg: '$fmpTime' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          startTime: { $add: [new Date(0), '$_id'] },
          maxFmp: 1,
          minFmp: 1,
          avgFmp: 1,
          count: 1,
        },
      },
      { $sort: { startTime: -1 } },
    ];
    return this.prefLogService.aggregate(pipe);
  }

  /**
   * 聚合获取性能时间
   * @param {any} query
   * @return {*}
   * @memberof PrefController
   */
  @GrpcMethod('PrefService', 'getTimeConsumingList')
  getTimeConsumingList(query: any) {
    const { page, size } = query;
    const matchFilter = handleSearchKeys<any>(query, KW_KEYS);
    let value = '';
    switch (query.reportsType) {
      case MetricsName.FCP:
        value = 'fcpTime.startTime';
        break;
      case MetricsName.FP:
        value = 'fpTime.startTime';
        break;
      case MetricsName.FMP:
        value = 'fmpTime';
        break;
      case MetricsName.CDR:
        value = 'exeTime';
        break;
    }
    // 排除大于15s的数据
    matchFilter[value] = { $lte: 150000 };
    const paginateOptions: any = { page: page, limit: size };
    return this.prefLogService.handleAggData(
      matchFilter,
      paginateOptions,
      '$' + value,
    );
  }

  /**
   * 聚合获取性能最大耗时时间前20个页面、用户id、UA信息
   * @param {any} query
   * @return {*}
   * @memberof PrefController
   */
  @GrpcMethod('PrefService', 'getTimeConsumingMaxList')
  getTimeConsumingMaxList(query: any) {
    const matchFilter = handleSearchKeys<any>(query, KW_KEYS);
    let value = '';
    switch (query.reportsType) {
      case MetricsName.FCP:
        value = 'fcpTime.startTime';
        break;
      case MetricsName.FP:
        value = 'fpTime.startTime';
        break;
      case MetricsName.FMP:
        value = 'fmpTime';
        break;
      case MetricsName.CDR:
        value = 'exeTime';
        break;
    }
    // 排除大于15s的数据
    matchFilter[value] = { $lte: 150000 };
    return this.prefLogService.handleAggMaxData(matchFilter, '$' + value);
  }
}
