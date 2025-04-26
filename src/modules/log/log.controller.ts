import { Controller, UseInterceptors } from '@nestjs/common';
import { PaginateOptions, PaginateResult, PipelineStage } from 'mongoose';
import { KW_KEYS } from '@app/constants/value.constant';
import { LogService } from './log.service';
import { Log } from './log.model';
import { isUndefined, omitBy, isNil } from 'lodash';
import {
  groupHourOption,
  handleSearchKeys,
  projectHourOption,
} from '@app/utils/searchCommon';
import { GrpcMethod } from '@nestjs/microservices';
import { ChartList, LogList, SaveLogRequest } from '@app/protos/log';
import { LogChartQueryDTO, LogPaginateQueryDTO } from './log.dto';
import { plainToClass } from 'class-transformer';
import { LoggingInterceptor } from '@app/interceptors/logging.interceptor';
import { createLogger } from '@app/utils/logger';
import { getUaInfo } from '@app/utils/util';

// 创建日志记录器，设置作用域为LogController，并启用时间戳
const logger = createLogger({
  scope: 'LogController',
  time: true,
});

/**
 * 日志控制器
 * @export
 * @class LogController
 */
@Controller('log')
@UseInterceptors(LoggingInterceptor) // 使用日志拦截器记录请求和响应
export class LogController {
  constructor(private readonly logService: LogService) {}

  /**
   * 上报日志
   * @param {SaveLogRequest} data - 日志数据请求对象
   * @return {*} 创建日志的结果
   * @memberof WeblogControll
   */
  @GrpcMethod('LogService', 'saveLog')
  async saveLog(data: SaveLogRequest) {
    // 清理数据中的空值
    const cleanedData = omitBy(data, isNil);
    // 解析用户代理信息
    const uaInfo = getUaInfo(cleanedData.ua);
    cleanedData.ua_result = uaInfo && JSON.stringify(uaInfo);
    // 记录接收到的日志数据
    logger.info(`日志接收数据${cleanedData.reportsType}`, cleanedData);
    // 创建日志记录
    return this.logService.create(cleanedData);
  }

  /**
   * 获取所有日志，支持分页
   * @param {LogPaginateQueryDTO} params - 分页查询参数
   * @return {*}  {Promise<PaginateResult<Log>>} 分页结果
   * @memberof LogController
   */
  @GrpcMethod('LogService', 'getLogs')
  getLogs(params: LogPaginateQueryDTO): Promise<PaginateResult<Log>> {
    // 转换查询参数为DTO对象
    const query = plainToClass(LogPaginateQueryDTO, params);
    const { page, size, sort, ...filters } = query;
    // 处理搜索关键字
    const paginateQuery = handleSearchKeys<LogPaginateQueryDTO>(query, KW_KEYS);

    // 添加分类过滤条件
    if (query.category) {
      paginateQuery.category = query.category;
    }
    // 添加报告类型过滤条件
    if (query.reportsType) {
      paginateQuery.reportsType = query.reportsType;
    }

    // 设置分页选项
    const paginateOptions: PaginateOptions = {
      page: page || 1,
      limit: size || 20,
    };

    // 设置排序方式
    if (!isUndefined(sort)) {
      paginateOptions.sort = { _id: sort };
    } else {
      paginateOptions.sort = { id: -1 };
    }

    // 再次确认分类过滤
    if (filters.category) {
      paginateQuery.category = filters.category;
    }

    // 排除不需要的字段，减少响应大小
    paginateOptions.select =
      '-href -path -title -value -_id -params -response -body -ip_location -meta -url';
    // 设置关联查询，同时排除不需要的关联字段
    paginateOptions.populate = {
      path: 'doce',
      select:
        '-siteId -events -stackTrace -breadcrumbs -errorList -_id -create_at -update_at -onModel', // 返回的数据过大导致，接口返回request content was evicted from inspector cache
    };

    // 执行分页查询
    return this.logService.paginate(paginateQuery, paginateOptions);
  }

  /**
   * 根据游标获取日志，支持无限滚动加载
   * @param {LogPaginateQueryDTO} data - 游标分页查询参数
   * @return {*}  {Promise<LogList>} 日志列表结果
   * @memberof LogController
   */
  @GrpcMethod('LogService', 'getLogsByCursor')
  getLogsByCursor(data: LogPaginateQueryDTO): Promise<LogList> {
    // 转换查询参数为DTO对象
    const query = plainToClass(LogPaginateQueryDTO, data);
    const { cursor, size, sort, ...filters } = query;
    // 处理搜索关键字
    let paginateQuery = handleSearchKeys<any>(query, KW_KEYS);

    // 添加分类过滤条件
    if (query.category) {
      paginateQuery.category = query.category;
    }
    // 添加报告类型过滤条件
    if (query.reportsType) {
      paginateQuery.reportsType = query.reportsType;
    }
    // 再次确认分类过滤
    if (filters.category) {
      paginateQuery.category = filters.category;
    }

    // 构建游标分页查询参数
    paginateQuery = {
      cursor: cursor, // 游标位置
      limit: size || 20, // 每页大小
      sort: !isUndefined(sort) ? { _id: sort } : { id: -1 }, // 排序方式
      primaryKey: !isUndefined(sort) ? '_id' : 'id', // 主键字段
      // 排除不需要的字段，减少响应大小
      select:
        '-href -path -title -value -params -response -body -ip_location -meta -url',
      // 设置关联查询，同时排除不需要的关联字段
      populate: {
        path: 'doce',
        select:
          '-siteId -events -stackTrace -breadcrumbs -errorList -_id -create_at -update_at -onModel', // 返回的数据过大导致，接口返回request content was evicted from inspector cache
      },
      ...paginateQuery, // 合并其他查询条件
    };

    // 执行游标分页查询
    return this.logService.cursorPaginate(paginateQuery);
  }

  /**
   * 获取日志图表数据，用于统计分析
   * @param {LogChartQueryDTO} data - 图表查询参数
   * @return {*}  {Promise<ChartList>} 图表数据列表
   * @memberof LogController
   */
  @GrpcMethod('LogService', 'getLogsChart') // 重复的装饰器，可能是错误
  async getLogsChart(data: LogChartQueryDTO): Promise<ChartList> {
    // 转换查询参数为DTO对象
    const query = plainToClass(LogChartQueryDTO, data);
    // 处理搜索关键字
    const matchFilter = handleSearchKeys<LogChartQueryDTO>(query, KW_KEYS);

    // 添加分类过滤条件
    if (query.category) {
      matchFilter.category = query.category;
    }
    // 添加报告类型过滤条件
    if (query.reportsType) {
      matchFilter.reportsType = query.reportsType;
    }

    // 判断时间段是否大于8小时
    const isGreaterEight = query.timeSlot > 8 * 60 * 60 * 1000;
    // 获取时间投影配置
    const projectOption = projectHourOption();
    // 获取分组配置，根据是否为24小时设置不同的分组方式
    const groupOption = groupHourOption(
      {
        count: { $sum: 1 }, // 计数统计
      },
      query.timeSlot === 24 * 60 * 60 * 1000,
    );

    // 按天聚合的管道配置
    const dayPipe: PipelineStage[] = [
      { $match: matchFilter }, // 匹配条件
      { ...projectOption }, // 时间投影
      { ...groupOption }, // 时间分组
      {
        $project: {
          _id: 0,
          startTime: '$_id.time', // 开始时间
          hour: '$_id.hour', // 小时
          apiList: 1, // API列表
          count: 1, // 计数
        },
      },
      { $sort: { startTime: 1 } }, // 按时间排序
    ];

    // 按时间段聚合的管道配置
    const pipe: PipelineStage[] = [
      { $match: matchFilter }, // 匹配条件
      {
        $group: {
          _id: {
            $subtract: [
              { $subtract: ['$create_at', new Date(0)] }, // 转换为时间戳
              {
                $mod: [
                  { $subtract: ['$create_at', new Date(0)] },
                  query.timeSlot, // 按指定时间段取模
                ],
              },
            ],
          },
          count: { $sum: 1 }, // 计数统计
        },
      },
      {
        $project: {
          _id: 0,
          count: 1, // 计数
          startTime: { $add: [new Date(0), '$_id'] }, // 开始时间
        },
      },
      { $sort: { startTime: 1 } }, // 按时间排序
    ];

    // 根据时间段选择合适的聚合管道执行查询
    const results = await this.logService.aggregation(
      isGreaterEight ? dayPipe : pipe,
    );
    logger.info('getLogsChart', results); // 记录查询结果
    return results;
  }

  /**
   * 根据不同类型分页聚合统计数据，如API或路径
   * @param {any} query - 查询参数，包含type和其他过滤条件
   * @return {*}  {Promise<any>} 聚合统计结果
   * @memberof WeblogControll
   */
  @GrpcMethod('LogService', 'getLogsAggregation')
  getLogsAggregation({ type, ...query }: any) {
    // 设置分页选项
    const paginateOptions: PaginateOptions = {
      page: query.page,
      limit: query.size,
    };
    // 处理搜索关键字
    const matchFilter = handleSearchKeys(query, KW_KEYS);

    // 添加分类过滤条件
    if (query.category) {
      matchFilter.category = query.category;
    }
    // 添加报告类型过滤条件
    if (query.reportsType) {
      matchFilter.reportsType = query.reportsType;
    }

    // 聚合管道配置
    const pipe: PipelineStage[] = [
      { $match: matchFilter }, // 匹配条件
      {
        $group: {
          _id: type == 'api' ? '$url' : '$path', // 根据类型分组
          value: { $sum: 1 }, // 计数统计
        },
      },
      { $project: { _id: 0, value: 1, name: '$_id', key: '$_id' } }, // 格式化输出
      { $sort: { value: -1 } }, // 按计数降序排序
    ];

    // 执行聚合查询
    return this.logService.aggregationPathOrUrl(pipe, paginateOptions);
  }

  /**
   * 处理信息 - Kafka消费者方法（已注释掉）
   * @param {any} any - 消息内容
   * @param {KafkaContext} context - Kafka上下文
   * @memberof WeblogControll
   */
  // @MessagePattern(MONITOR_TOPIC)
  // async handleMessage(@Payload() any: any, @Ctx() context: KafkaContext) {
  //   const startNow = Date.now();
  //   const { offset } = context.getMessage();
  //   const heartbeat = context.getHeartbeat();
  //   const partition = context.getPartition();
  //   const topic = context.getTopic();
  //   await this.logService.handleOffsets([{ topic, partition, offset }]);
  //   this.logService.create(any);
  //   await heartbeat();
  //   logger.info('Kafka消费成功offset=', offset);
  //   logger.info('kafka消费总耗时：', `${Date.now() - startNow}ms`);
  //   return offset;
  // }

  /**
   * 获取内存使用数据统计
   * @param {any} query - 查询参数
   * @return {*} 内存使用统计结果
   * @memberof LogController
   */
  @GrpcMethod('LogService', 'getMemoryData')
  getMemoryData({ ...query }: any) {
    // 处理搜索关键字
    const matchFilter = handleSearchKeys<any>(query, KW_KEYS);

    // 添加分类过滤条件
    if (query.category) {
      matchFilter.category = query.category;
    }
    // 添加报告类型过滤条件
    if (query.reportsType) {
      matchFilter.reportsType = query.reportsType;
    }

    // 聚合管道配置
    const pipe: PipelineStage[] = [
      { $match: matchFilter }, // 匹配条件
      {
        $group: {
          _id: {
            $subtract: [
              { $subtract: ['$create_at', new Date(0)] }, // 转换为时间戳
              {
                $mod: [{ $subtract: ['$create_at', new Date(0)] }, 60 * 1000], // 按分钟分组
              },
            ],
          },
          // apiList: { $push: { create_at: '$create_at' } }, //查看时间段内的数据
          // 计算平均内存大小（MB）
          avgTotalSize: { $avg: { $divide: ['$totalSize', 1024 * 1024] } },
          avgUsedSize: { $avg: { $divide: ['$usedSize', 1024 * 1024] } },
          avgLimitSize: { $avg: { $divide: ['$limitSize', 1024 * 1024] } },
          // 计算最大内存大小（MB）
          maxTotalSize: { $max: { $divide: ['$totalSize', 1024 * 1024] } },
          maxUsedSize: { $max: { $divide: ['$usedSize', 1024 * 1024] } },
          maxLimitSize: { $max: { $divide: ['$limitSize', 1024 * 1024] } },
          // 计算最小内存大小（MB）
          minTotalSize: { $min: { $divide: ['$totalSize', 1024 * 1024] } },
          minUsedSize: { $min: { $divide: ['$usedSize', 1024 * 1024] } },
          minLimitSize: { $min: { $divide: ['$limitSize', 1024 * 1024] } },
        },
      },
      {
        $project: {
          _id: 0,
          // 输出所有计算的内存指标
          avgTotalSize: 1,
          avgUsedSize: 1,
          avgLimitSize: 1,
          maxTotalSize: 1,
          maxUsedSize: 1,
          maxLimitSize: 1,
          minTotalSize: 1,
          minUsedSize: 1,
          minLimitSize: 1,
          startTime: { $add: [new Date(0), '$_id'] }, // 开始时间
        },
      },
      { $sort: { startTime: 1 } }, // 按时间排序
    ];

    // 执行聚合查询
    return this.logService.aggregation(pipe);
  }

  /**
   * 处理IP地址，获取地理位置信息
   * @param {string} ip - IP地址
   * @return {*} IP地理位置信息
   * @memberof LogController
   */
  @GrpcMethod('LogService', 'handleIPLocation')
  handleIPLocation({ ip }: { ip: string }) {
    return this.logService.hadnleIPLocation(ip);
  }
}
