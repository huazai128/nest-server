import { MongooseModel, MongooseID } from '@app/interfaces/mongoose.interface';
import { InjectModel } from '@app/transformers/model.transform';
import { Injectable } from '@nestjs/common';
import { PaginateOptions, PipelineStage, Types } from 'mongoose';
import { EventLog } from './eventLog.model';
import { PaginateQuery } from '@app/interfaces/paginate.interface';
import {
  groupHourOption,
  handleSearchKeys,
  projectHourOption,
} from '@app/utils/searchCommon';

import { createLogger } from '@app/utils/logger';

// 创建日志记录器
const logger = createLogger({ scope: 'EventLogService', time: true });

// 定义事件日志搜索关键字
export const KW_KEYS: Array<string> = ['logId', 'logPos', 'logData', 'logName'];

@Injectable()
export class EventLogService {
  constructor(
    @InjectModel(EventLog) private readonly eventModel: MongooseModel<EventLog>,
  ) {}

  /**
   * 创建事件上报
   * @param {EventLog} eventData - 事件数据
   * @return {Promise<Types.ObjectId>} 返回创建的事件ID
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
   * @param {MongooseID} siteId - 站点ID
   * @return {Promise<any>} 删除结果
   * @memberof EventLogService
   */
  public async siteIdRemove(siteId: MongooseID) {
    const eventResult = await this.eventModel
      .deleteMany({ siteId: siteId })
      .exec();
    logger.log('站点删除后event日志删除', siteId, eventResult);
    return eventResult;
  }

  /**
   * 批量删除事件日志
   * @param {MongooseID[]} ids - 要删除的事件ID数组
   * @return {Promise<any>} 删除结果
   * @memberof EventLogService
   */
  public async batchDelete(ids: MongooseID[]) {
    const eventResult = await this.eventModel
      .deleteMany({ _id: { $in: ids } })
      .exec();
    return eventResult;
  }

  /**
   * 聚合数据查询
   * @param {any} query - 查询参数
   * @return {Promise<any>} 聚合结果
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
   * 分页查询事件日志
   * @param {PaginateQuery<EventLog>} paginateQuery - 分页查询条件
   * @param {PaginateOptions} paginateOptions - 分页选项
   * @return {Promise<any>} 分页结果
   * @memberof EventLogService
   */
  public async paginate(
    paginateQuery: PaginateQuery<EventLog>,
    paginateOptions: PaginateOptions,
  ) {
    return this.eventModel.paginate(paginateQuery, paginateOptions);
  }

  /**
   * 根据上报ID分类聚合数据并分页
   * @param {any} query - 查询参数
   * @return {Promise<any>} 分页聚合结果
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
   * 通用处理聚合查询
   * @private
   * @param {any} query - 查询参数
   * @return {PipelineStage[]} 聚合管道配置
   * @memberof EventLogService
   */
  private handleAggregateQuery(query: any): PipelineStage[] {
    // 处理搜索关键字
    const matchFilter = handleSearchKeys<any>(query, KW_KEYS);
    // 判断时间段是否大于8小时
    const isGreaterEight = query.timeSlot > 8 * 60 * 60 * 1000;
    // 获取投影选项
    const projectOption = projectHourOption();
    // 获取分组选项
    const groupOption = groupHourOption(
      {
        apiList: { $push: { create_at: '$create_at', hour: '$hour' } },
        count: { $sum: 1 },
      },
      query.timeSlot === 24 * 60 * 60 * 1000,
    );

    // 按天聚合的管道配置
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

    // 按时间段聚合的管道配置
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
          apiList: { $push: { create_at: '$create_at' } }, // 查看时间段内的数据
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

    // 根据时间段长度选择合适的管道配置
    return isGreaterEight ? dayPipe : pipe;
  }
}
