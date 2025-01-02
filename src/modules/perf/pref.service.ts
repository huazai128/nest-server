import { MongooseID, MongooseModel } from '@app/interfaces/mongoose.interface';
import { InjectModel } from '@app/transformers/model.transform';
import { Injectable } from '@nestjs/common';
import { PaginateOptions, PipelineStage, Types } from 'mongoose';
import { PrefLog } from './pref.model';
import logger from '@app/utils/logger';
import { Cron } from '@nestjs/schedule';
import * as dayjs from 'dayjs';

@Injectable()
export class PrefService {
  constructor(
    @InjectModel(PrefLog) private readonly prefModel: MongooseModel<PrefLog>,
  ) {}

  /**
   *  新增
   * @param {PrefLog} data
   * @return {*}  {Promise<Types.ObjectId>}
   * @memberof PrefService
   */
  async create(data: PrefLog): Promise<Types.ObjectId> {
    try {
      const res = await this.prefModel.create(data);
      return res._id;
    } catch (error) {
      logger.error('Pref 保存失败', JSON.stringify(data), error);
      throw new Error(`Pref 保存失败 ${error}`);
    }
  }

  /**
   * 根据站点ID删除相关性能上报
   * @param {MongooseID} siteId
   * @return {*}
   * @memberof PvLogService
   */
  public async siteIdRemove(siteId: MongooseID) {
    const prefResult = await this.prefModel
      .deleteMany({ siteId: siteId })
      .exec();
    return prefResult;
  }

  /**
   * 批量删除
   * @param {MongooseID[]} ids
   * @return {*}
   * @memberof PvLogService
   */
  public async batchDelete(ids: MongooseID[]) {
    const prefResult = await this.prefModel
      .deleteMany({ _id: { $in: ids } })
      .exec();
    return prefResult;
  }

  /**
   * 聚合数据
   * @param {PipelineStage[]} pipeParams
   * @return {*}
   * @memberof PvLogService
   */
  public async aggregate(pipeParams: PipelineStage[]) {
    return this.prefModel
      .aggregate(pipeParams)
      .then((data) => {
        return data;
      })
      .catch((err) => {
        logger.error('Pref聚合错误', err);
        return Promise.reject(err);
      });
  }

  /**
   * 分页聚合数据
   * @param {PipelineStage[]} pipeParams
   * @param {PaginateOptions} paginateOptions
   * @return {*}
   * @memberof ApiLogService
   */
  public async aggregatePaginate(
    pipeParams: PipelineStage[],
    paginateOptions: PaginateOptions,
  ) {
    const aggregateQuery = this.prefModel.aggregate(pipeParams);
    return this.prefModel
      .aggregatePaginate(aggregateQuery, paginateOptions)
      .then((res) => {
        return res;
      })
      .catch((err) => {
        logger.error('Pref分页聚合', err);
        return Promise.reject(err);
      });
  }

  /**
   * 删除30天前的数据
   * @private
   * @memberof WebLogService
   */
  private deleteThirtyDayData = async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 15);
    const res = await this.prefModel
      .deleteMany({ create_at: { $lt: thirtyDaysAgo } })
      .exec();
    logger.info('prev删除结果', res);
  };

  /**
   * 调度任务
   * @private
   * @memberof WebLogService
   */
  @Cron('0 * * * *') // 每天凌晨
  private handleScheduleJob() {
    logger.info('prev触发时间', dayjs().format('YYYY-MM-DD HH:mm:ss'));
    this.deleteThirtyDayData();
  }

  /**
   * 通用聚合各种页面各种性能
   * @param {PipelineStage.Match['$match']} matchFilter
   * @param {PaginateOptions} paginateOptions
   * @memberof PrefService
   */
  public handleAggData(
    matchFilter: PipelineStage.Match['$match'],
    paginateOptions: PaginateOptions,
    value: string,
  ) {
    const pipe: PipelineStage[] = [
      { $match: matchFilter },
      {
        $group: {
          _id: '$path',
          max: { $max: value },
          min: { $min: value },
          avg: { $avg: value },
          count: { $sum: 1 },
        },
      },
      { $project: { path: '$_id', max: 1, min: 1, avg: 1, count: 1 } },
      { $sort: { count: -1 } },
    ];
    const prefAgg = this.prefModel.aggregate(pipe);
    return this.prefModel
      .aggregatePaginate(prefAgg, paginateOptions)
      .then((res) => {
        return res;
      })
      .catch((err) => {
        logger.error('Pref 性能', err);
        return Promise.reject(err);
      });
  }

  /**
   * 通用聚合各种页面各种性能最大值前20个数据
   * @param {PipelineStage.Match['$match']} matchFilter
   * @param {string} value
   * @return {*}
   * @memberof PrefService
   */
  public handleAggMaxData(
    matchFilter: PipelineStage.Match['$match'],
    value: string,
  ) {
    const pipe: PipelineStage[] = [
      { $match: matchFilter },
      {
        $group: {
          _id: { path: '$path', userId: '$userId', ua: '$ua_result.ua' },
          maxTime: { $max: value },
        },
      },
      {
        $project: {
          path: '$_id.path',
          userId: '$_id.userId',
          ua: '$_id.ua',
          maxTime: 1,
        },
      },
      { $sort: { maxTime: -1 } },
      {
        $limit: 20,
      },
    ];
    return this.prefModel.aggregate(pipe);
  }
}
