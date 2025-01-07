import {
  DateQueryDTO,
  KeywordDTO,
  SiteIdQueryDTO,
  KeyIdQueryDTO,
} from '@app/models/query.model';
import { IntersectionType } from '@nestjs/mapped-types';
import { FilterQuery, PipelineStage, Types } from 'mongoose';
import lodasd, { isNumber, isObject } from 'lodash';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ONLY_KEYS } from '@app/constants/value.constant';

/**
 * 通用搜索参数不带siteId
 * @export
 * @class SearchDTO
 * @extends {IntersectionType(KeywordDTO, DateQueryDTO, KeyIdQueryDTO)}
 */
export class SearchDTO extends IntersectionType(
  KeywordDTO,
  DateQueryDTO,
  KeyIdQueryDTO,
) {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  path?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  reportsType?: string;
}

/**
 * 通用搜索参数携带siteId
 * @export
 * @class SearchCommonDTO
 * @extends {IntersectionType(SearchDTO, SiteIdQueryDTO)}
 */
export class SearchCommonDTO extends IntersectionType(
  SearchDTO,
  SiteIdQueryDTO,
) {}

/**
 * 通用处理搜索
 * @export
 * @template T
 * @param {T} query
 * @param {Array<string>} KEYS
 * @return {*}  {FilterQuery<T>}
 */
export function handleCommonSearchKeys<T extends SearchDTO>(
  query: T,
  KEYS: Array<string>,
): FilterQuery<T> {
  const keyParams: FilterQuery<T>['$or'] = [];
  let keyAndParams: FilterQuery<T>['$and'] = [];
  const matchFilter: FilterQuery<PipelineStage.Match['$match']> = {};
  if (query.keyId) {
    const trimmed = lodasd.trim(query.keyId);
    ONLY_KEYS.forEach((item) => {
      keyParams.push({ [item]: new RegExp(trimmed, 'i') });
    });
  }
  if (query.path) {
    keyAndParams.push({ path: query.path });
  }
  if (query.reportsType) {
    matchFilter.reportsType = query.reportsType;
  }
  // or: 只要满足其中一个
  if (query.kw) {
    const trimmed = lodasd.trim(query.kw);
    KEYS.forEach((item: string) => {
      keyParams.push({ [item]: new RegExp(trimmed, 'i') });
    });
  }
  // and: 满足所有条件
  if (query.keywordParmas) {
    const paramsResult = iterateQueryParams<T>(query.keywordParmas);
    keyAndParams = keyAndParams.concat(paramsResult);
  }
  if (query.startTime && query.endTime) {
    matchFilter.create_at = {
      $gte: new Date(query.startTime),
      $lt: new Date(query.endTime),
    };
  }
  if (keyParams.length) {
    matchFilter.$or = keyParams;
  }
  if (keyAndParams.length) {
    matchFilter.$and = keyAndParams;
  }
  return matchFilter;
}

/**
 *  处理通用聚合过滤查询
 * @export
 * @template T
 * @param {T} query
 * @param {Array<string>} KEYS
 * @return {*}  {FilterQuery<T>}
 */
export function handleSearchKeys<T extends SearchCommonDTO>(
  query: T,
  KEYS: Array<string>,
): FilterQuery<T> {
  const matchFilter = handleCommonSearchKeys(query, KEYS);
  if (!query.siteId) {
    throw '缺少站点ID';
  }
  matchFilter.siteId = new Types.ObjectId(query.siteId);
  return matchFilter;
}

/**
 * 处理字段转成 RegExp
 * @export
 * @template T
 * @param {Record<string, any>} queryParams
 * @return {*}  {Record<string, any>}
 */
export function iterateQueryParams<T>(
  queryParams: Record<string, any>,
  pKey?: string,
): FilterQuery<T>['$and'] {
  let processedParams: FilterQuery<T>['$and'] = [];
  for (const [key, value] of Object.entries(queryParams)) {
    const nKey = pKey ? `${pKey}.${key}` : key;
    if (isObject(value)) {
      const subParams: FilterQuery<T>['$and'] = iterateQueryParams<T>(
        value,
        nKey,
      );
      processedParams = processedParams.concat(subParams); // 将子参数合并到 processedParams 数组中
    } else {
      if (nKey.includes('body') && isNumber(value)) {
        processedParams.push({ [nKey]: value });
      } else {
        processedParams.push({ [nKey]: new RegExp(value, 'i') });
      }
    }
  }
  return processedParams;
}

/**
 * 通用处理12小时以及每天的时间分配
 * @export
 * @param {object} [params]
 * @return {*}  {PipelineStage.Project}
 */
export function projectHourOption(params?: object): PipelineStage.Project {
  return {
    $project: {
      day: {
        $dateToString: {
          date: '$create_at',
          format: '%Y-%m-%d',
          timezone: 'GMT',
        },
      },
      hour: { $hour: { date: '$create_at' } }, // 东八区
      create_at: 1,
      ...(params || {}),
    },
  };
}

/**
 * 通用分段处理12小时以及每天的时间分配
 * @export
 * @param {object} params
 * @param {boolean} isDay
 * @return {*}  {PipelineStage.Group}
 */
export function groupHourOption(
  params: object,
  isDay: boolean,
  idParmas = {},
): PipelineStage.Group {
  if (!isDay) {
    idParmas = {
      hour: { $subtract: ['$hour', { $mod: ['$hour', 12] }] },
      ...idParmas,
    };
  }
  return {
    $group: {
      _id: { time: '$day', ...idParmas },
      ...params,
    },
  };
}

/**
 * 通用分段处理12小时以及每天的时间分配
 * @export
 * @param {object} params
 * @param {boolean} isDay
 * @param {*} [idParmas={}]
 * @return {*}  {PipelineStage.Group}
 */
export function groupHourOptionId(
  params: object,
  isDay: boolean,
  idParmas = {},
): PipelineStage.Group {
  if (!isDay) {
    idParmas = {
      hour: '$_id.hour',
      ...idParmas,
    };
  }
  return {
    $group: {
      _id: { time: '$_id.time', ...idParmas },
      ...params,
    },
  };
}
