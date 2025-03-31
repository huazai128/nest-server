import { MongooseID, MongooseModel } from '@app/interfaces/mongoose.interface';
import { InjectModel } from '@app/transformers/model.transform';
import { Injectable } from '@nestjs/common';
import { PaginateOptions, PipelineStage, Types } from 'mongoose';
import { CustomLog } from './customLog.model';
import { PaginateQuery } from '@app/interfaces/paginate.interface';
import {
  groupHourOption,
  handleSearchKeys,
  projectHourOption,
} from '@app/utils/searchCommon';

import { createLogger } from '@app/utils/logger';

const logger = createLogger({ scope: 'CustomLogService', time: true });

export const KW_KEYS: Array<string> = [
  'eventId',
  'eventCategory',
  'eventAction',
  'eventLabel',
  'eventValue',
];

@Injectable()
export class CustomLogService {
  constructor(
    @InjectModel(CustomLog)
    private readonly customModel: MongooseModel<CustomLog>,
  ) {}

  /**
   * 自定义上报
   * @param {CustomLog} data
   * @return {*}  {Promise<Types.ObjectId>}
   * @memberof CustomLogService
   */
  async create(data: CustomLog): Promise<Types.ObjectId> {
    try {
      logger.log('Custom保存', JSON.stringify(data));
      const res = await this.customModel.create(data);
      return res._id;
    } catch (error) {
      logger.error('Custom保存失败', JSON.stringify(data), error);
      throw new Error(`Custom保存失败 ${error}`);
    }
  }

  /**
   * 根据站点ID删除相关自定义上报
   * @param {MongooseID} siteId
   * @return {*}
   * @memberof CustomLogService
   */
  public async siteIdRemove(siteId: MongooseID) {
    const customResult = await this.customModel
      .deleteMany({ siteId: siteId })
      .exec();
    logger.log('站点删除后custom日志删除', siteId, customResult);
    return customResult;
  }

  /**
   * 批量删除
   * @param {MongooseID[]} ids
   * @return {*}
   * @memberof CustomLogService
   */
  public async batchDelete(ids: MongooseID[]) {
    const customResult = await this.customModel
      .deleteMany({ _id: { $in: ids } })
      .exec();
    logger.log('站点删除后custom日志删除');
    return customResult;
  }

  /**
   * 聚合数据
   * @param {any} query
   * @return {*}
   * @memberof CustomLogService
   */
  public async aggregate(query: any) {
    const pipeParams = this.handleAggregateQuery(query);
    return this.customModel
      .aggregate(pipeParams)
      .then((data) => {
        return data;
      })
      .catch((err) => {
        logger.error('Event聚合错误', err);
        return Promise.reject(err);
      });
  }

  /**
   * 分页查询
   * @param {PaginateQuery<ErrorLog>} paginateQuery
   * @param {PaginateOptions} paginateOptions
   * @return {*}
   * @memberof EventLogService
   */
  public async paginate(
    paginateQuery: PaginateQuery<CustomLog>,
    paginateOptions: PaginateOptions,
  ) {
    return this.customModel.paginate(paginateQuery, paginateOptions);
  }

  /**
   * 根据上报ID 分类聚合聚合数据
   * @param {any} query
   * @memberof CustomLogService
   */
  public async paginateAggregate(query: any) {
    const { page, size } = query;
    const paginateOptions: PaginateOptions = { page: page, limit: size };
    const pipeQuery = this.handleAggregateQuery(query);
    const pipe = this.customModel.aggregate(pipeQuery);
    return this.customModel.aggregatePaginate(pipe, paginateOptions);
  }

  /**
   * 通用处理聚合
   * @private
   * @param {any} query
   * @return {*}  {PipelineStage[]}
   * @memberof CustomLogService
   */
  private handleAggregateQuery(query: any): PipelineStage[] {
    const { timeSlot } = query;
    const matchFilter = handleSearchKeys<any>(query, KW_KEYS);
    const isDay = timeSlot > 8 * 60 * 60 * 1000;
    const isOneDay = timeSlot === 24 * 60 * 60 * 1000;
    const projectOption = projectHourOption();
    const groupOption = groupHourOption(
      {
        apiList: { $push: { create_at: '$create_at', hour: '$hour' } },
        count: { $sum: 1 },
      },
      isOneDay,
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
          apiList: 1,
          count: 1,
        },
      },
      { $sort: { startTime: 1 } },
    ];
    const pipe: PipelineStage[] = [
      { $match: matchFilter },
      {
        $group: {
          _id: {
            $subtract: [
              { $subtract: ['$create_at', new Date(0)] },
              {
                $mod: [{ $subtract: ['$create_at', new Date(0)] }, timeSlot],
              },
            ],
          },
          apiList: { $push: { create_at: '$create_at' } }, //查看时间段内的数据
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          apiList: 1,
          count: 1,
          startTime: { $add: [new Date(0), '$_id'] },
        },
      },
      { $sort: { startTime: 1 } },
    ];
    return isDay ? dayPipe : pipe;
  }
}
