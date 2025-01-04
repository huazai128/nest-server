import { MongooseID, MongooseModel } from '@app/interfaces/mongoose.interface';
import { PaginateQuery } from '@app/interfaces/paginate.interface';
import { InjectModel } from '@app/transformers/model.transform';
import { Inject, Injectable, OnModuleInit, forwardRef } from '@nestjs/common';
import { PaginateOptions, PipelineStage, Types } from 'mongoose';
import { ErrorLog, StackTrace } from './error.model';
import { existsSync, readFileSync } from 'fs-extra';
import { NullableMappedPosition, SourceMapConsumer } from 'source-map';
import { HelperServiceAlarn } from '@app/processors/helper/helper.service.alarm';
import logger from '@app/utils/logger';
import * as dayjs from 'dayjs';
import { join } from 'path';
import { isEmpty } from 'lodash';
import { SiteService } from '../site/site.service';
import { handleTime } from '@app/utils/util';
import { TimeInfo } from '@app/interfaces/request.interface';
import { groupHourOption, projectHourOption } from '@app/utils/searchCommon';
import { MetricsName } from '@app/constants/enum.contant';
import { Cron } from '@nestjs/schedule';

interface SourceInfo {
  context: string | string[];
  originLine: number;
  source: string | null;
}

const eightTime = 8 * 60 * 60 * 1000;
const dayTime = eightTime * 3;

@Injectable()
export class ErrorLogService implements OnModuleInit {
  constructor(
    @InjectModel(ErrorLog) private readonly errorModel: MongooseModel<ErrorLog>,
    @Inject(forwardRef(() => SiteService))
    private readonly siteService: SiteService,
    private readonly alarnService: HelperServiceAlarn,
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
      const indexExists = await this.errorModel.collection.indexExists(
        'meta.response.result_1',
      );
      if (indexExists) {
        const result = await this.errorModel.collection.dropIndex(
          'meta.response.result_1',
        );
        logger.info('index 删除成功:', result);
      } else {
        logger.info('index 不存在');
      }
    } catch (error) {
      logger.error('检测或者删除index 错误:', error);
    }
  }

  /**
   * 新建错误上报信息
   * @param {ErrorLog} eventData
   * @return {*}  {Promise<Types.ObjectId>}
   * @memberof ErrorLogService
   */
  async create(eventData: ErrorLog): Promise<Types.ObjectId> {
    try {
      const errorInfo = await this.handleFileMap(
        eventData.stackTrace,
        eventData.siteId,
      );
      if (errorInfo) {
        eventData.errorDetail = JSON.stringify(errorInfo);
      }
      const res = await this.errorModel.create({ ...eventData });
      return res._id;
    } catch (error) {
      logger.error('Error 保存失败', error);
      throw new Error(`error 保存失败 ${error}`);
    }
  }

  /**
   * 根据站点ID删除相关错误上报
   * @param {MongooseID} siteId
   * @return {*}
   * @memberof PvLogService
   */
  public async siteIdRemove(siteId: MongooseID) {
    const errorResult = await this.errorModel
      .deleteMany({ siteId: siteId })
      .exec();
    return errorResult;
  }

  /**
   * 批量删除
   * @param {MongooseID[]} ids
   * @return {*}
   * @memberof PvLogService
   */
  public async batchDelete(ids: MongooseID[]) {
    const errorResult = await this.errorModel
      .deleteMany({ _id: { $in: ids } })
      .exec();
    return errorResult;
  }

  /**
   * 根据站点ID查询错误数据
   * @param {PaginateQuery<ErrorLog>} paginateQuery
   * @param {PaginateOptions} paginateOptions
   * @return {*}
   * @memberof ErrorLogService
   */
  public async paginate(
    paginateQuery: PaginateQuery<ErrorLog>,
    paginateOptions: PaginateOptions,
  ) {
    return this.errorModel.paginate(paginateQuery, paginateOptions);
  }

  /**
   * 统计错误数据
   * @param {PipelineStage[]} pipeParams
   * @return {*}
   * @memberof ErrorLogService
   */
  public async aggregate(pipeParams: PipelineStage[]) {
    return this.errorModel
      .aggregate(pipeParams)
      .then((data) => {
        return data;
      })
      .catch((err) => {
        logger.error('Error聚合错误', err);
        return Promise.reject(err);
      });
  }

  /**
   * 统计总览数据
   * @param {MongooseID} siteId
   * @return {*}
   * @memberof ErrorLogService
   */
  public async statisticsData(siteId: MongooseID) {
    const totalPromise = this.getErrorTotal(siteId);
    const threeDataPromise = this.getThreeData(siteId);
    const errorStatusPromise = this.getErrorStatus(siteId);
    return Promise.all([
      totalPromise,
      threeDataPromise,
      errorStatusPromise,
    ]).then((reuslt) => {
      return reuslt;
    });
  }

  /**
   * 根据错误值统计
   * @param {MongooseID} siteId
   * @param {PaginateOptions} paginateOptions
   * @return {*}
   * @memberof ErrorLogService
   */
  public async statisticsValuesData(
    siteId: MongooseID,
    paginateOptions: PaginateOptions,
  ) {
    const aggregateQuery = this.errorModel.aggregate([
      { $match: { siteId: siteId } },
      { $group: { _id: '$value', total: { $sum: 1 } } },
      { $project: { id: 1, total: 1 } },
      { $sort: { _id: 1 } },
    ]);
    return this.errorModel.aggregatePaginate(aggregateQuery, paginateOptions);
  }

  /**
   *统计当前站点下所有错误数
   * @private
   * @param {MongooseID} siteId
   * @return {*}  {Promise<number>}
   * @memberof ErrorLogService
   */
  private async getErrorTotal(siteId: MongooseID): Promise<{ total: number }> {
    const total = await this.errorModel
      .countDocuments({ siteId: siteId })
      .exec();
    return { total: total };
  }

  /**
   * 查询三天前的错误上报数据
   * @private
   * @param {MongooseID} siteId
   * @return {*}
   * @memberof ErrorLogService
   */
  private getThreeData(siteId: MongooseID) {
    const startTime = dayjs().subtract(2, 'day').startOf('day').valueOf();
    const endTime = dayjs().valueOf();
    return this.aggregate([
      {
        $match: {
          siteId: siteId,
          create_at: { $gte: startTime, $lt: endTime },
        },
      },
      {
        $project: {
          day: { $dateToString: { date: '$create_at', format: '%Y-%m-%d' } },
        },
      },
      { $group: { _id: '$day', total: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
  }

  /**
   * 根据错误类型统计数据
   * @private
   * @param {MongooseID} siteId
   * @return {*}
   * @memberof ErrorLogService
   */
  private getErrorStatus(siteId: MongooseID) {
    return this.aggregate([
      { $match: { siteId: siteId } },
      { $group: { _id: '$reportsType', total: { $sum: 1 } } },
      { $project: { id: 1, total: 1 } },
      { $sort: { _id: 1 } },
    ]);
  }

  /**
   * 处理错误文件
   * @private
   * @param {ErrorLog['stackTrace']} stackTrace
   * @param {ErrorLog['siteId']} siteId
   * @return {*}  {(Promise<SourceInfo | null>)}
   * @memberof ErrorLogService
   */
  private async handleFileMap(
    stackTrace: ErrorLog['stackTrace'],
    siteId: ErrorLog['siteId'],
  ): Promise<SourceInfo | null> {
    let starkFirst!: StackTrace;
    const list = stackTrace || [];
    if (Array.isArray(list) && !!list.length && list[0] && list[0].filename) {
      starkFirst = list[0];
    }
    if (
      starkFirst &&
      starkFirst.filename &&
      /\.(js)/.test(starkFirst.filename)
    ) {
      const ext = starkFirst.filename.split('/js/')[1];
      if (ext) {
        // 获取错误文件URL,如果上传到服务器云上直接拉取
        const url = join(
          __dirname,
          `../../../public/sourcemap/${siteId}`,
          `/${ext}.map`,
        );
        if (existsSync(url)) {
          const rawSourceMap = JSON.parse(
            readFileSync(url, 'utf-8').toString(),
          );
          return await this.sourceMapAnalysis(
            rawSourceMap,
            starkFirst.lineno,
            starkFirst.colno,
            5,
          );
        }
      }
    }
    return null;
  }

  /**
   *  SourceMap解析错误信息
   * @private
   * @param {*} sourceMapFile
   * @param {number} line
   * @param {number} column
   * @param {number} offset
   * @return {*}  {(Promise<SourceInfo | null>)}
   * @memberof ErrorLogService
   */
  private async sourceMapAnalysis(
    sourceMapFile,
    line: number,
    column: number,
    offset: number,
  ): Promise<SourceInfo | null> {
    const consumer = await new SourceMapConsumer(sourceMapFile);
    const sm: NullableMappedPosition = consumer.originalPositionFor({
      line: Number(line),
      column: Number(column),
    });
    if (!!sm) {
      const { sources } = consumer;
      const smIndex = (sm?.source && sources.indexOf(sm?.source)) || 0;
      const smContent = consumer.sourcesContent[smIndex];
      const rawLines = smContent && smContent.split(/\r?\n/g);
      const line = sm?.line || 0;
      let begin = line - offset;
      const end = line + offset + 1;
      begin = begin < 0 ? 0 : begin;
      const context = rawLines && rawLines.slice(begin, end);
      consumer.destroy();
      return {
        context,
        originLine: line + 1,
        source: sm.source,
      };
    }
    return null;
  }

  /**
   * 批量更新录制
   * @param {any} { errorUUidList, events }
   * @return {*}
   * @memberof ErrorLogService
   */
  public saveRecordData({ errorUUidList, events }: any) {
    logger.info('批量更新录制', JSON.stringify(errorUUidList));
    try {
      return this.errorModel
        .updateMany(
          { errorUUid: { $in: errorUUidList } },
          { $set: { events: events } },
        )
        .exec()
        .catch((error) => {
          logger.error(
            '批量更新录制失败：',
            JSON.stringify(errorUUidList),
            error,
          );
          throw '批量更新录制失败';
        });
    } catch (error) {
      logger.error('批量更新录制失败：', error);
    }
  }

  /**
   * 根据ID获取错误信息
   * @param {number} id
   * @return {*}
   * @memberof ErrorLogService
   */
  public getIdByInfo(id: number) {
    return this.errorModel.findOne({ id: id }).exec();
  }

  /**
   *  通用处理单天、单月、年的统计数据数据
   * @param {PipelineStage.Match['$match']} matchFilter
   * @param {TimeInfo} timeInfo
   * @return {*}
   * @memberof PvLogService
   */
  public async commonSingleDayData(
    matchFilter: PipelineStage.Match['$match'],
    timeInfo: TimeInfo,
    isDay?: boolean,
  ) {
    const { dMatch, yMatch, lMatch } = handleTime(matchFilter, timeInfo);
    const [today, yesterday, lastWeek] = await Promise.all([
      this.handleHourOrDayAggregate(dMatch, isDay),
      this.handleHourOrDayAggregate(yMatch, isDay),
      this.handleHourOrDayAggregate(lMatch, isDay),
    ]);
    return {
      today: today[0] || {},
      yesterday: yesterday[0] || {},
      lastWeek: lastWeek[0] || {},
    };
  }

  /**
   * 通用处理单天、单月、年的统计数据数据
   * @public
   * @param {PipelineStage.Match['$match']} matchFilter
   * @return {*}
   * @memberof PvLogService
   */
  public handleAggragateData(
    matchFilter: PipelineStage.Match['$match'],
    timeSlot = 60 * 60 * 1000,
  ): PipelineStage[] {
    const isGreaterEight = timeSlot > eightTime;
    const isDay = timeSlot === dayTime;
    const projectOption = projectHourOption({ reportsType: 1 });
    const groupOption = groupHourOption(
      {
        count: { $sum: 1 },
      },
      isDay,
      {
        value: '$reportsType',
      },
    );
    const dayPipe: PipelineStage[] = [
      { $match: matchFilter },
      { ...projectOption },
      { ...groupOption },
      { $sort: { count: -1 } },
      {
        $group: {
          _id: null,
          total: { $sum: '$count' },
          data: {
            $push: {
              type: '$_id.value',
              count: '$count',
              startTime: '$_id.time',
            },
          },
        },
      },
      { $project: { _id: 0, total: '$total', data: '$data' } },
    ];
    const pipe: PipelineStage[] = [
      { $match: matchFilter },
      {
        $group: {
          _id: {
            time: {
              $subtract: [
                { $subtract: ['$create_at', new Date(0)] },
                {
                  $mod: [{ $subtract: ['$create_at', new Date(0)] }, timeSlot],
                },
              ],
            },
            value: '$reportsType',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$count' },
          data: {
            $push: {
              type: '$_id.value',
              count: '$count',
              startTime: { $add: [new Date(0), '$_id.time'] },
            },
          },
        },
      },
      { $project: { _id: 0, total: '$total', data: '$data' } },
    ];
    return isGreaterEight ? dayPipe : pipe;
  }

  /**
   * 聚合每小时或者每一天的数据
   * @private
   * @param {PipelineStage.Match['$match']} matchFilter
   * @return {*}
   * @memberof ErrorLogService
   */
  private handleHourOrDayAggregate(
    matchFilter: PipelineStage.Match['$match'],
    isDay?: boolean,
  ) {
    const pipe = this.handleAggragateData(
      matchFilter,
      isDay ? dayTime : 60 * 60 * 1000,
    );
    return this.errorModel.aggregate(pipe);
  }

  /**
   * 根据错误类型统计数据
   * @param {PipelineStage.Match['$match']} matchFilter
   * @param {PaginateOptions} paginateOptions
   * @param {MetricsName} type
   * @return {*}
   * @memberof ErrorLogService
   */
  public pagingStatisticsError(
    matchFilter: PipelineStage.Match['$match'],
    paginateOptions: PaginateOptions,
    type: MetricsName,
  ) {
    let groupQuery: PipelineStage.Group['$group'] = {};
    switch (type) {
      case MetricsName.JS:
      case MetricsName.UJ:
        groupQuery = {
          // JS 和promise 根据错误值
          _id: { value: '$value', path: '$path' },
        };
        break;
      case MetricsName.HTS:
      case MetricsName.HT:
        groupQuery = {
          // http请求 根据错误值
          _id: { path: '$meta.url', value: '$meta.response.status' },
        };
        break;
      case MetricsName.REACT:
        groupQuery = {
          // React 组件 根据错误值
          _id: { path: '$path', value: '$meta.conponentName' },
        };
        break;
      default:
        groupQuery = {
          _id: { value: '$value' },
        };
        break;
    }
    const pipe: PipelineStage[] = [
      { $match: matchFilter },
      {
        $group: {
          ...groupQuery,
          count: { $sum: 1 },
          errorList: { $push: { errorUUid: '$errorUUid', meta: '$meta' } },
        },
      },
      {
        $project: {
          _id: 0,
          count: '$count',
          errorList: '$errorList',
          value: '$_id.value',
          path: '$_id.path',
        },
      },
      { $sort: { count: -1 } },
    ];
    const aggregate = this.errorModel.aggregate(pipe);
    return this.errorModel.aggregatePaginate(aggregate, paginateOptions);
  }

  /**
   * 获取错误聚合总数
   * @private
   * @param {PipelineStage.Match['$match']} matchFilter
   * @return {*}
   * @memberof PvLogService
   */
  private getErrorCount(matchFilter: PipelineStage.Match['$match']) {
    return this.errorModel.countDocuments(matchFilter);
  }

  /**
   * 聚合统计错误信息，并且返回错误数据总数
   * @param {PipelineStage.Match['$match']} matchFilter
   * @param {PaginateOptions} paginateOptions
   * @param {MetricsName} type
   * @memberof ErrorLogService
   */
  public async paginateErrorData(
    matchFilter: PipelineStage.Match['$match'],
    paginateOptions: PaginateOptions,
    type: MetricsName,
  ) {
    const [aggregateData, count] = await Promise.all([
      this.pagingStatisticsError(matchFilter, paginateOptions, type),
      this.getErrorCount(matchFilter),
    ]);
    return { ...aggregateData, dataTotal: count };
  }

  /**
   * 处理上报告警
   * @param {ErrorLog} eventData
   * @memberof ErrorLogService
   */
  public async handleErrorAlert(eventData: ErrorLog) {
    const siteInfo = await this.siteService.getSiteInfo(
      eventData.siteId as unknown as string,
    );
    const rules = siteInfo?.apiRules;
    // 错误类型为HttpError时检查是否需要触发告警
    if (eventData.errorType === 'HttpError') {
      const apiUrl = eventData.meta.url || '';
      const response = eventData.meta.response;
      const thisApiRules = rules?.filter(
        (item) =>
          item.apiUrlPattern === '*' || apiUrl.includes(item.apiUrlPattern),
      );

      if (thisApiRules?.length && response) {
        // 每个规则都没有命中的时候需要上报
        const finalNeedSend = thisApiRules?.every((rule) => {
          // ignore为true时不上报
          if (rule.ignore) {
            return false;
          }
          // 未指定key 不检查
          if (!rule.key) return true;
          const value = response?.[rule.key];
          // allowEmpty为true时空值不上报
          if (rule.allowEmpty && (!value || isEmpty(value))) {
            return false;
          }
          // value在指定枚举值中不上报
          if (rule.enums?.includes(value)) {
            return false;
          }
          return true;
        });
        finalNeedSend && this.alarnService.sendErrorAlarm(eventData);
      } else {
        // 未设置规则时直接触发告警
        this.alarnService.sendErrorAlarm(eventData);
      }
    } else {
      if (
        !(
          eventData.value &&
          (/.open/.test(eventData.value) ||
            /Request/.test(eventData.value) ||
            /An attempt/.test(eventData.value))
        )
      ) {
        this.alarnService.sendErrorAlarm(eventData);
      }
    }
  }
  /**
   * 删除90天前的数据
   * @private
   * @memberof WebLogService
   */
  private deleteThirtyDayData = async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 15);
    const res = await this.errorModel
      .deleteMany({ create_at: { $lt: thirtyDaysAgo } })
      .exec();
    logger.info('error删除结果', res);
  };

  /**
   * 调度任务
   * @private
   * @memberof WebLogService
   */
  @Cron('0 * * * *') // 每天凌晨
  private handleScheduleJob() {
    logger.info('error触发时间', dayjs().format('YYYY-MM-DD HH:mm:ss'));
    this.deleteThirtyDayData();
  }
}
