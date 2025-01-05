import { MongooseModel, MongooseID } from '@app/interfaces/mongoose.interface';
import { InjectModel } from '@app/transformers/model.transform';
import { Injectable } from '@nestjs/common';
import {
  PaginateOptions,
  PaginateResult,
  PipelineStage,
  Types,
} from 'mongoose';
import { EventLog } from './eventLog.model';
import { PaginateQuery } from '@app/interfaces/paginate.interface';
import {
  groupHourOption,
  handleSearchKeys,
  projectHourOption,
} from '@app/utils/searchCommon';

import { createLogger } from '@app/utils/logger';

const logger = createLogger({ scope: 'EventLogService', time: true });

export const KW_KEYS: Array<string> = ['logId', 'logPos', 'logData', 'logName'];

@Injectable()
export class EventLogService {
  constructor(
    @InjectModel(EventLog) private readonly eventModel: MongooseModel<EventLog>,
  ) {}

  /**
   * 删除事件上报
   * @param {EventLog} eventData
   * @return {*}  {Promise<Types.ObjectId>}
   * @memberof EventLogService
   */
  async create(eventData: EventLog): Promise<Types.ObjectId> {
    try {
      const res = await this.eventModel.create(eventData);
      return res._id;
    } catch (error) {
      logger.error('Event 保存失败', JSON.stringify(eventData), error);
      throw new Error(`Event 保存失败 ${error}`);
    }
  }

  /**
   * 根据站点ID删除相关事件上报
   * @param {MongooseID} siteId
   * @return {*}
   * @memberof EventLogService
   */
  public async siteIdRemove(siteId: MongooseID) {
    const eventResult = await this.eventModel
      .deleteMany({ siteId: siteId })
      .exec();
    logger.log('站点删除后error日志删除', siteId, eventResult);
    return eventResult;
  }

  /**
   * 批量删除
   * @param {MongooseID[]} ids
   * @return {*}
   * @memberof EventLogService
   */
  public async batchDelete(ids: MongooseID[]) {
    const eventResult = await this.eventModel
      .deleteMany({ _id: { $in: ids } })
      .exec();
    return eventResult;
  }

  /**
   * 聚合数据
   * @param {any} query
   * @return {*}
   * @memberof EventLogService
   */
  public async aggregate(query: any) {
    const pipeParams = this.handleAggregateQuery(query);
    return this.eventModel
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
    paginateQuery: PaginateQuery<EventLog>,
    paginateOptions: PaginateOptions,
  ) {
    return this.eventModel.paginate(paginateQuery, paginateOptions);
  }

  /**
   * 根据上报ID 分类聚合聚合数据
   * @param {any} query
   * @return {*}
   * @memberof EventLogService
   */
  public async paginateAggregate(query: any) {
    const { page, size } = query;
    const paginateOptions: PaginateOptions = { page: page, limit: size };
    const pipeQuery = this.handleAggregateQuery(query);
    const pipe = this.eventModel.aggregate(pipeQuery);
    return this.eventModel.aggregatePaginate(pipe, paginateOptions);
  }

  /**
   * 通用处理聚合
   * @private
   * @param {any} query
   * @return {*}
   * @memberof EventLogService
   */
  private handleAggregateQuery(query: any) {
    const matchFilter = handleSearchKeys<any>(query, KW_KEYS);
    const isGreaterEight = query.timeSlot > 8 * 60 * 60 * 1000;
    const projectOption = projectHourOption();
    const groupOption = groupHourOption(
      {
        apiList: { $push: { create_at: '$create_at', hour: '$hour' } },
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
                $mod: [
                  { $subtract: ['$create_at', new Date(0)] },
                  query.timeSlot,
                ],
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
    return isGreaterEight ? dayPipe : pipe;
  }
}
