import { MongooseID, MongooseModel } from '@app/interfaces/mongoose.interface';
import { InjectModel } from '@app/transformers/model.transform';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PaginateOptions, PipelineStage, Types } from 'mongoose';
import { ApiLog } from './api.model';
import { Cron } from '@nestjs/schedule';
import * as dayjs from 'dayjs';
import { createLogger } from '@app/utils/logger';

const logger = createLogger({ scope: 'ApiLogService', time: true });

@Injectable()
export class ApiLogService implements OnModuleInit {
  constructor(
    @InjectModel(ApiLog) private readonly apiModel: MongooseModel<ApiLog>,
  ) {}

  onModuleInit() {
    this.checkAndDropIndex();
  }

  /**
   * 删除index
   * @memberof ApiLogService
   */
  async checkAndDropIndex() {
    try {
      const indexExists =
        await this.apiModel.collection.indexExists('response.result_1');
      if (indexExists) {
        const result =
          await this.apiModel.collection.dropIndex('response.result_1');
        logger.info('index 删除成功:', result);
      } else {
        logger.info('index 不存在');
      }
    } catch (error) {
      logger.error('检测或者删除index 错误:', error);
    }
  }

  /**
   * API上报
   * @param {ApiLog} apiLog
   * @return {*}  {Promise<Types.ObjectId>}
   * @memberof ApiLogService
   */
  async create(apiLog: ApiLog): Promise<Types.ObjectId> {
    try {
      const res = await this.apiModel.create(apiLog);
      return res._id;
    } catch (error) {
      logger.error('Api上报 报错失败:', error);
      throw new Error(`Api上报 报错失败 ${error}`);
    }
  }

  /**
   * 根据站点ID删除相关API上报
   * @param {MongooseID} siteId
   * @return {*}
   * @memberof PvLogService
   */
  public async siteIdRemove(siteId: MongooseID) {
    const apiResult = await this.apiModel.deleteMany({ siteId: siteId }).exec();
    logger.log('删除站点后api日志删除', siteId, apiResult);
    return apiResult;
  }

  /**
   * 批量删除
   * @param {MongooseID[]} ids
   * @return {*}
   * @memberof PvLogService
   */
  public async batchDelete(ids: MongooseID[]) {
    const apiResult = await this.apiModel
      .deleteMany({ _id: { $in: ids } })
      .exec();
    return apiResult;
  }

  /**
   * 聚合数据
   * @param {PipelineStage[]} pipeParams
   * @return {*}
   * @memberof PvLogService
   */
  public async aggregate(pipeParams: PipelineStage[]) {
    return this.apiModel
      .aggregate(pipeParams)
      .then((data) => {
        return data;
      })
      .catch((err) => {
        logger.error('Api聚合错误', err);
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
    const aggregateQuery = this.apiModel.aggregate(pipeParams);
    return this.apiModel
      .aggregatePaginate(aggregateQuery, paginateOptions)
      .then((res) => {
        return res;
      })
      .catch((err) => {
        logger.error('API分页聚合', err);
        return Promise.reject(err);
      });
  }

  /**
   * 删除15天前的数据
   * @private
   * @memberof WebLogService
   */
  private deleteThirtyDayData = async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 5);
    const res = await this.apiModel
      .deleteMany({ create_at: { $lt: thirtyDaysAgo } })
      .exec();
    logger.info('api删除结果', res);
  };

  /**
   * 调度任务
   * @private
   * @memberof WebLogService
   */
  @Cron('0 * * * *') // 每天凌晨
  private handleScheduleJob() {
    logger.info('api触发时间', dayjs().format('YYYY-MM-DD HH:mm:ss'));
    this.deleteThirtyDayData();
  }
}
