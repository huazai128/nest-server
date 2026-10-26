import { KW_KEYS } from '@app/constants/value.constant';
import {
  LOG_FIELD_LIMITS,
  truncateUtf8ByBytes,
} from '@app/constants/logFieldLimits.constant';
import { SaveLogRequest } from '@app/protos/log';
import { handleSearchKeys } from '@app/utils/searchCommon';
import { PaginateResult } from 'mongoose';
import { FilterQuery, Types } from 'mongoose';
import * as dayjs from 'dayjs';
import { Log } from './log.model';
import { LogPaginateQueryDTO } from './log.dto';

const QUERY_CONTROL_KEYS = new Set([
  'page',
  'size',
  'sort',
  'cursor',
  'limit',
  'primaryKey',
  'select',
  'populate',
  'timeSlot',
  'format',
  'type',
]);

/** 从 QueryDTO 提取 Mongo 过滤条件，避免 cursor/limit 等进入 find */
export function buildLogMatchFilter(
  query: Record<string, unknown>,
): FilterQuery<Log> {
  const searchInput = { ...query };
  for (const key of QUERY_CONTROL_KEYS) {
    delete searchInput[key];
  }
  const match = handleSearchKeys<LogPaginateQueryDTO>(
    searchInput as unknown as LogPaginateQueryDTO,
    KW_KEYS,
  );
  if (match.siteId && typeof match.siteId === 'string') {
    match.siteId = new Types.ObjectId(match.siteId) as any;
  }
  return match;
}

const LIST_RESPONSE_OMIT = new Set([
  'doce',
  '__v',
  'body',
  'params',
  'meta',
  'response',
  'ip_location',
]);

/** 列表/游标查询：主表 + doce 扁平化，裁剪过大字段 */
export function mapLogDocToListItem(doc: Record<string, any>): SaveLogRequest {
  const { doce, ...rest } = doc;
  const merged = {
    ...rest,
    ...(doce && typeof doce === 'object' ? doce : {}),
  };

  if (merged.create_at) {
    merged.create_at = dayjs(merged.create_at).format('YYYY-MM-DD HH:mm:ss');
  }
  if (merged.update_at) {
    merged.update_at = dayjs(merged.update_at).format('YYYY-MM-DD HH:mm:ss');
  }
  if (merged._id) {
    merged._id = String(merged._id);
  }
  if (merged.errorUUid && !merged.errorUid) {
    merged.errorUid = merged.errorUUid;
  }
  if (merged.errorUid && !merged.errorUUid) {
    merged.errorUUid = merged.errorUid;
  }

  for (const key of LIST_RESPONSE_OMIT) {
    delete merged[key];
  }

  if (typeof merged.value === 'string') {
    merged.value = truncateUtf8ByBytes(
      merged.value,
      LOG_FIELD_LIMITS.VALUE_MAX_BYTES,
    );
  }
  if (typeof merged.events === 'string') {
    merged.events = truncateUtf8ByBytes(merged.events, 32_768);
  }

  return merged as SaveLogRequest;
}

export function paginateResultToLogList(result: PaginateResult<Log>) {
  return {
    data: (result.docs || []).map((doc) => {
      const plain =
        typeof (doc as any).toObject === 'function'
          ? (doc as any).toObject()
          : doc;
      return mapLogDocToListItem(plain as Record<string, any>);
    }),
    pagination: {
      totalDocs: result.totalDocs ?? 0,
      limit: result.limit ?? 0,
      totalPages: result.totalPages ?? 0,
      page: result.page ?? 1,
      pagingCounter: result.pagingCounter ?? 0,
      hasPrevPage: result.hasPrevPage ?? false,
      hasNextPage: result.hasNextPage ?? false,
      prevPage: result.prevPage ?? 0,
      nextPage: result.nextPage ?? 0,
      nextCursor: '',
    },
  };
}
