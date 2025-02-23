import { MongooseID, MongooseModel } from '@app/interfaces/mongoose.interface';
import { InjectModel } from '@app/transformers/model.transform';
import { Injectable } from '@nestjs/common';
import { PaginateOptions, PipelineStage, Types } from 'mongoose';
import { PvLog } from './pv.model';
import logger from '@app/utils/logger';
import { TimeInfo } from '@app/interfaces/request.interface';
import {
  groupHourOption,
  groupHourOptionId,
  projectHourOption,
} from '@app/utils/searchCommon';
import { handleTime } from '@app/utils/util';

/**
 * PV日志服务
 * 处理页面访问相关的统计数据
 */
@Injectable()
export class PvLogService {
  constructor(
    @InjectModel(PvLog) private readonly pvModel: MongooseModel<PvLog>,
  ) {}

  /**
   * 创建新的PV记录
   * @param {PvLog} data - PV日志数据
   * @returns {Promise<Types.ObjectId>} 创建的记录ID
   */
  public async create(data: PvLog): Promise<Types.ObjectId> {
    try {
      const res = await this.pvModel.create(data);
      return res._id;
    } catch (error) {
      logger.error('PV记录保存失败', JSON.stringify(data), error);
      throw new Error(`PV记录保存失败: ${error}`);
    }
  }

  /**
   * 删除指定站点的所有PV记录
   * @param {MongooseID} siteId - 站点ID
   * @returns {Promise} 删除结果
   */
  public async siteIdRemove(siteId: MongooseID) {
    const pvResult = await this.pvModel.deleteMany({ siteId: siteId }).exec();
    return pvResult;
  }

  /**
   * 批量删除PV记录
   * @param {MongooseID[]} ids - 要删除的记录ID数组
   * @returns {Promise} 删除结果
   */
  public async batchDelete(ids: MongooseID[]) {
    const pvResult = await this.pvModel
      .deleteMany({ _id: { $in: ids } })
      .exec();
    return pvResult;
  }

  /**
   * 执行聚合管道查询
   * @param {PipelineStage[]} pipeParams - 聚合管道参数
   * @returns {Promise} 聚合结果
   */
  public async aggregate(pipeParams: PipelineStage[]) {
    return this.pvModel
      .aggregate(pipeParams)
      .then((data) => {
        return data;
      })
      .catch((err) => {
        logger.error('PV聚合查询失败', err);
        return Promise.reject(err);
      });
  }

  /**
   * 分页获取路由访问统计数据
   * @param {PipelineStage.Match['$match']} matchFilter - 匹配条件
   * @param {PaginateOptions} paginateOptions - 分页选项
   * @returns {Promise} 分页后的路由访问数据
   */
  public async getRoutePaths(
    matchFilter: PipelineStage.Match['$match'],
    paginateOptions: PaginateOptions,
  ) {
    const pipeLine: PipelineStage[] = [
      { $match: matchFilter },
      // { $group: { _id: { path: '$path', title: '$title' }, count: { $sum: 1 } } },
      { $group: { _id: { path: '$path' }, value: { $sum: 1 } } },
      {
        $project: {
          _id: 0,
          id: '$_id.path',
          name: '$_id.path',
          value: 1,
          key: '$_id.path',
        },
      },
      { $sort: { value: -1 } },
    ];
    const aggregateQuery = this.pvModel.aggregate(pipeLine);
    // 后续会做出缓存
    return this.pvModel
      .aggregatePaginate(aggregateQuery, paginateOptions)
      .then((res) => {
        return res;
      })
      .catch((err) => {
        logger.error('路由访问统计查询失败', err);
        return Promise.reject(err);
      });
  }

  /**
   * 获取指定时间段的PV统计数据(今天/昨天/上周)
   * @param {PipelineStage.Match['$match']} matchFilter - 匹配条件
   * @param {TimeInfo} timeInfo - 时间范围信息
   * @returns {Promise} 各时间段的统计数据
   */
  public async getSingleDayData(
    matchFilter: PipelineStage.Match['$match'],
    timeInfo: TimeInfo,
  ) {
    const { dMatch, yMatch, lMatch } = handleTime(matchFilter, timeInfo);
    const [today, yesterday, lastWeek] = await Promise.all([
      this.handleCommon(dMatch),
      this.handleCommon(yMatch),
      this.handleCommon(lMatch),
    ]);
    return {
      today: today[0] || {},
      yesterday: yesterday[0] || {},
      lastWeek: lastWeek[0] || {},
    };
  }

  /**
   * 生成日期统计聚合管道
   * @param {PipelineStage.Match['$match']} matchFilter - 匹配条件
   * @param {boolean} isDay - 是否按天统计
   * @returns {T} 聚合管道数组
   */
  public dayAggregate<T>(
    matchFilter: PipelineStage.Match['$match'],
    isDay?: boolean,
  ): T {
    const projectOption = projectHourOption({
      userId: { $ifNull: ['$userId', '$ip'] },
    }); // // 如果userID 为空使用IP填充值
    const groupOption = groupHourOption({ count: { $sum: 1 } }, !!isDay, {
      userId: '$userId',
    });
    const groupDay = groupHourOptionId(
      { pv: { $sum: '$count' }, uv: { $sum: 1 } },
      !!isDay,
    );
    const pipe = [
      { $match: matchFilter },
      { ...projectOption },
      { ...groupOption }, // 根据用户和时间统计每个用户的PV
      { ...groupDay }, // 在根据时间统计每一天所有PV和UV
      {
        $project: {
          _id: 0,
          startTime: '$_id.time',
          hour: '$_id.hour',
          pv: 1,
          uv: 1,
        },
      },
    ];
    return pipe as T;
  }

  /**
   * 处理通用统计逻辑
   * @param {PipelineStage.Match['$match']} matchFilter - 匹配条件
   * @returns {Promise} 统计结果
   */
  private async handleCommon(matchFilter: PipelineStage.Match['$match']) {
    const commonPipe: PipelineStage[] = [
      // _id:表示将所有文档分为同一组（因为 _id 被设置为 null），并计算该组中 pv 和 uv 字段的总和
      {
        $group: {
          _id: null,
          totalPv: { $sum: '$pv' },
          totalUv: { $sum: '$uv' },
          apiList: { $push: { create_at: '$startTime', pv: '$pv', uv: '$uv' } },
        },
      },
      { $project: { _id: 0, totalPv: 1, totalUv: 1, apiList: 1 } },
    ];

    const pipe = this.dayAggregate<PipelineStage[]>(
      {
        ...matchFilter,
      },
      true,
    );
    return this.pvModel.aggregate([...pipe, ...commonPipe]).exec();
  }

  /**
   * 获取设备相关统计数据
   * @param {PipelineStage.Match['$match']} matchFilter - 匹配条件
   * @param {string} type - 设备类型(browser/os/screen)
   * @returns {Promise} 设备统计数据
   */
  public getTerminalDataOneDay(
    matchFilter: PipelineStage.Match['$match'],
    type: string,
  ) {
    let projectQuery: any = {};
    switch (type) {
      case 'browser':
        projectQuery = { name: '$ua_result.browser.name' };
        break;
      case 'os':
        projectQuery = {
          name: { $concat: ['$ua_result.os.name', '$ua_result.os.version'] },
        };
        break;
      default:
        projectQuery = { name: '$winScreen' };
        break;
    }
    const pipe: PipelineStage[] = [
      { $match: matchFilter },
      {
        $project: {
          ...projectQuery,
        },
      },
      { $group: { _id: { name: '$name' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      {
        $group: {
          _id: null,
          total: { $sum: '$count' },
          data: { $push: { name: '$_id.name', count: '$count' } },
        },
      },
      { $project: { _id: 0, data: 1, total: 1 } },
    ];
    return this.pvModel.aggregate(pipe);
  }

  /**
   * 聚合分页统计页面路由
   * @param {PipelineStage.Match['$match']} matchFilter - 匹配条件
   * @param {PaginateOptions} paginateOptions - 分页选项
   * @returns {Promise} 分页统计结果
   */
  public async aggregateStatisticsPath(
    matchFilter: PipelineStage.Match['$match'],
    paginateOptions: PaginateOptions,
  ) {
    const [aggregateData, count] = await Promise.all([
      this.getRoutePaths(matchFilter, paginateOptions),
      this.getPathCount(matchFilter),
    ]);
    return { ...aggregateData, dataTotal: count };
  }

  /**
   * 获取路由总数
   * @param {PipelineStage.Match['$match']} matchFilter - 匹配条件
   * @returns {Promise<number>} 路由总数
   */
  private getPathCount(matchFilter: PipelineStage.Match['$match']) {
    return this.pvModel.countDocuments(matchFilter);
  }

  /**
   * 获取指定时间段的统计数据
   * @param {PipelineStage.Match['$match']} matchFilter - 匹配条件
   * @param {TimeInfo} timeInfo - 时间范围信息
   * @returns {Promise} 统计数据
   */
  public async commonSingleDayData(
    matchFilter: PipelineStage.Match['$match'],
    timeInfo: TimeInfo,
  ) {
    const { dMatch, yMatch, lMatch } = handleTime(matchFilter, timeInfo);
    const [today, yesterday, lastWeek] = await Promise.all([
      this.handleAggragateData(dMatch),
      this.handleAggragateData(yMatch),
      this.handleAggragateData(lMatch),
    ]);
    return {
      today: today || [],
      yesterday: yesterday || [],
      lastWeek: lastWeek || [],
    };
  }

  /**
   * 处理单个时间段的统计数据
   * @param {PipelineStage.Match['$match']} matchFilter - 匹配条件
   * @returns {Promise} 统计结果
   */
  private handleAggragateData(matchFilter: PipelineStage.Match['$match']) {
    const pipeLine: PipelineStage[] = [
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
                    60 * 60 * 1000,
                  ],
                },
              ],
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          count: 1,
          startTime: { $add: [new Date(0), '$_id.time'] },
        },
      },
      { $sort: { startTime: 1 } },
    ];
    return this.pvModel.aggregate(pipeLine).exec();
  }

  /**
   * 分页获取浏览器信息统计
   * @param {PipelineStage.Match['$match']} matchFilter - 匹配条件
   * @param {PaginateOptions} paginateOptions - 分页选项
   * @returns {Promise} 浏览器统计数据
   */
  public async getBrowserInfo(
    matchFilter: PipelineStage.Match['$match'],
    paginateOptions: PaginateOptions,
  ) {
    const pipe: PipelineStage[] = [
      { $match: matchFilter },
      {
        $group: {
          _id: {
            name: '$ua_result.browser.name',
            version: '$ua_result.browser.version',
            ua: '$ua_result.ua',
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          name: '$_id.name',
          version: '$_id.version',
          value: '$_id.version',
          key: '$_id.name',
          ua: '$_id.ua',
          count: '$count',
        },
      },
      { $sort: { count: -1 } },
    ];
    const aggregateQuery = this.pvModel.aggregate(pipe);
    return this.pvModel
      .aggregatePaginate(aggregateQuery, paginateOptions)
      .then((res) => {
        return res;
      })
      .catch((err) => {
        logger.error('浏览器统计查询失败', err);
        return Promise.reject(err);
      });
  }
}
