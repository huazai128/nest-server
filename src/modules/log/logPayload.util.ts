import { SaveLogRequest } from '@app/protos/log';
import {
  LOG_FIELD_LIMITS,
  clampInt32,
  clampMemoryMetric,
  truncateUtf8ByBytes,
} from '@app/constants/logFieldLimits.constant';
import { isObject } from 'lodash';

/**
 * 入站日志归一化：先还原 SDK 压缩字段，再按 LOG_FIELD_LIMITS 裁剪，保证 Kafka / gRPC 两条路径入库一致。
 */

/** Mongo 带索引的短字符串字段，统一裁到 INDEXED_STRING_MAX_BYTES，防止索引键超限 */
const INDEXED_STRING_KEYS = [
  'path',
  'href',
  'referrer',
  'prevHref',
  'title',
  'userId',
  'url',
  'method',
  'winScreen',
  'docScreen',
  'traceId',
  'monitorId',
  'pageId',
  'errorUid',
  'errorUUid',
  'eventAction',
  'eventCategory',
  'ip',
  'logName',
] as const;

/** 长文本字段及各自入库上限，与 log_field_limits.proto 对齐 */
const LONG_TEXT_KEYS: Array<{
  key: keyof SaveLogRequest;
  max: number;
}> = [
  { key: 'value', max: LOG_FIELD_LIMITS.VALUE_MAX_BYTES },
  { key: 'content', max: LOG_FIELD_LIMITS.CONTENT_MAX_BYTES },
  { key: 'logData', max: LOG_FIELD_LIMITS.LOG_DATA_MAX_BYTES },
  { key: 'nodeDom', max: LOG_FIELD_LIMITS.NODE_DOM_MAX_BYTES },
  { key: 'events', max: LOG_FIELD_LIMITS.EVENTS_MAX_BYTES },
  { key: 'ua', max: LOG_FIELD_LIMITS.UA_MAX_BYTES },
  { key: 'eventValue', max: LOG_FIELD_LIMITS.LOG_DATA_MAX_BYTES },
  { key: 'errorDetail', max: LOG_FIELD_LIMITS.VALUE_MAX_BYTES },
  { key: 'logUrl', max: LOG_FIELD_LIMITS.LOG_URL_MAX_BYTES },
];

/**
 * 把任意值收成字符串再按字节截断；空值返回 undefined，避免把空串写入索引字段。
 * @param {unknown} value
 * @param {number} maxBytes
 * @return {(string | undefined)}
 */
function truncateOptionalString(
  value: unknown,
  maxBytes: number,
): string | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const str =
    typeof value === 'string'
      ? value
      : typeof value === 'number' || typeof value === 'boolean'
        ? String(value)
        : JSON.stringify(value);
  return truncateUtf8ByBytes(str, maxBytes);
}

/**
 * 从 SDK 只上报的 queryUrl 拆出 path 与 query。
 * 解码失败时保留原始键值，避免整段 URL 丢失。
 * @param {string} queryUrl 含 query 的完整请求 URL
 * @return {{ url: string, params?: Record<string, string> }}
 */
function splitQueryUrl(
  queryUrl: string,
): { url: string; params?: Record<string, string> } {
  const q = queryUrl.indexOf('?');
  const url = q === -1 ? queryUrl : queryUrl.slice(0, q);
  if (q === -1 || q === queryUrl.length - 1) {
    return { url };
  }
  const params: Record<string, string> = {};
  queryUrl
    .slice(q + 1)
    .split('&')
    .forEach((pair) => {
      if (!pair) {
        return;
      }
      const eq = pair.indexOf('=');
      const rawKey = eq === -1 ? pair : pair.slice(0, eq);
      const rawVal = eq === -1 ? '' : pair.slice(eq + 1);
      try {
        const key = decodeURIComponent(rawKey.replace(/\+/g, ' '));
        const value = decodeURIComponent(rawVal.replace(/\+/g, ' '));
        if (key) {
          params[key] = value;
        }
      } catch {
        if (rawKey) {
          params[rawKey] = rawVal;
        }
      }
    });
  return Object.keys(params).length ? { url, params } : { url };
}

/**
 * 根对象或 meta 上用 queryUrl 回填 url / params。
 * 已有非空 url 不覆盖，兼容旧客户端仍传 url 的情况。
 * @param {(Record<string, unknown> | undefined)} target
 */
function hydrateHttpFromQueryUrl(
  target: Record<string, unknown> | undefined,
): void {
  if (!target) {
    return;
  }
  if (typeof target.queryUrl !== 'string' || !target.queryUrl) {
    return;
  }
  if (target.url != null && target.url !== '') {
    return;
  }
  const parsed = splitQueryUrl(target.queryUrl);
  target.url = parsed.url;
  if (target.params == null && parsed.params) {
    target.params = parsed.params;
  }
}

/**
 * 对齐资源性能字段：SDK 用 ttfb/time/ssl(number)，历史 proto 用 timeToFirstByte/requestDuration/ssl(bool)。
 * 双向补齐，并在 request 缺失时用 ttfb 回填，保证 PrefLog.ResourcePref 能入库。
 * @param {Record<string, unknown>} row 单条 resourcePrefs
 */
function hydrateResourcePref(row: Record<string, unknown>): void {
  const ttfb = row.ttfb ?? row.timeToFirstByte;
  const time = row.time ?? row.requestDuration;
  if (row.ttfb == null && ttfb != null) {
    row.ttfb = ttfb;
  }
  if (row.timeToFirstByte == null && ttfb != null) {
    row.timeToFirstByte = ttfb;
  }
  if (row.time == null && time != null) {
    row.time = time;
  }
  if (row.requestDuration == null && time != null) {
    row.requestDuration = time;
  }
  if (row.request == null && ttfb != null) {
    row.request = ttfb;
  }
  if (row.sslTime == null && typeof row.ssl === 'number') {
    row.sslTime = row.ssl;
  }
  // gRPC bool ssl 会丢掉耗时；有 sslTime 时回填给 Mongo ResourcePref.ssl
  if (typeof row.ssl === 'boolean') {
    row.ssl =
      typeof row.sslTime === 'number' && row.sslTime > 0
        ? row.sslTime
        : row.ssl
          ? 1
          : 0;
  }
}

/**
 * 还原 SDK 压缩字段，不覆盖调用方已给的 url / request。
 * queryUrl → url/params；资源 ttfb → request；历史 proto 别名与 SDK 字段对齐。
 */
export function hydrateCollectedAliases(
  data: Record<string, unknown>,
): void {
  const prefs = data.resourcePrefs;
  if (Array.isArray(prefs)) {
    prefs.forEach((row) => {
      if (row && typeof row === 'object') {
        hydrateResourcePref(row as Record<string, unknown>);
      }
    });
  }
  hydrateHttpFromQueryUrl(data);
  if (data.meta && typeof data.meta === 'object') {
    hydrateHttpFromQueryUrl(data.meta as Record<string, unknown>);
  }
}

/**
 * 裁剪 HTTP 响应摘要：status 钳到 int32，result 按 RESPONSE_RESULT_MAX_BYTES 截断。
 * @param {SaveLogRequest['response']} response
 * @return {SaveLogRequest['response']}
 */
function trimResponseResult(response: SaveLogRequest['response']) {
  if (!response?.result || typeof response.result !== 'string') {
    return response;
  }
  return {
    ...response,
    status: clampInt32(response.status),
    result: truncateUtf8ByBytes(
      response.result,
      LOG_FIELD_LIMITS.RESPONSE_RESULT_MAX_BYTES,
    ),
  };
}

/**
 * gRPC / Kafka 入站 SaveLogRequest 归一化。
 * 顺序：还原压缩别名 → 同步 errorUid/errorUUid → 索引/长文本裁剪 → 数值钳位。
 * @param {SaveLogRequest} input
 * @return {SaveLogRequest}
 */
export function normalizeInboundSaveLog(
  input: SaveLogRequest,
): SaveLogRequest {
  const data = { ...input } as SaveLogRequest & Record<string, unknown>;
  hydrateCollectedAliases(data);

  if (data.errorUUid && !data.errorUid) {
    data.errorUid = data.errorUUid;
  } else if (data.errorUid && !data.errorUUid) {
    data.errorUUid = data.errorUid;
  }

  for (const key of INDEXED_STRING_KEYS) {
    const v = data[key as string];
    if (v !== undefined && v !== null) {
      data[key as string] = truncateOptionalString(
        v,
        LOG_FIELD_LIMITS.INDEXED_STRING_MAX_BYTES,
      );
    }
  }

  for (const { key, max } of LONG_TEXT_KEYS) {
    const trimmed = truncateOptionalString(data[key], max);
    if (trimmed !== undefined) {
      (data as any)[key] = trimmed;
    }
  }

  if (data.response) {
    data.response = trimResponseResult(data.response);
  }

  if (data.meta?.response?.result && typeof data.meta.response.result === 'string') {
    data.meta = {
      ...data.meta,
      status: clampInt32(data.meta.status),
      response: {
        ...data.meta.response,
        result: truncateUtf8ByBytes(
          data.meta.response.result,
          LOG_FIELD_LIMITS.RESPONSE_RESULT_MAX_BYTES,
        ),
      },
    };
  }

  if (data.status !== undefined) {
    data.status = clampInt32(data.status);
  }
  if (data.type !== undefined) {
    data.type = clampInt32(data.type);
  }

  data.totalSize = clampMemoryMetric(data.totalSize);
  data.usedSize = clampMemoryMetric(data.usedSize);
  data.limitSize = clampMemoryMetric(data.limitSize);

  if (isObject(data.value)) {
    data.value = truncateUtf8ByBytes(
      JSON.stringify(data.value),
      LOG_FIELD_LIMITS.VALUE_MAX_BYTES,
    );
  }

  stripSessionLogBody(data);

  return data;
}

/**
 * 会话 .log 已有 OSS 链接时丢掉正文，避免 1.5MB 再进 Mongo。
 * rrweb 的 events 不是 `# session-` / session-*.log，不会误删。
 * @param {SaveLogRequest} data
 */
export function stripSessionLogBody(data: SaveLogRequest): void {
  const logName = data.logName;
  const events = data.events;
  const isSession =
    (typeof logName === 'string' && /^session-.+\.log$/i.test(logName)) ||
    (typeof events === 'string' && events.startsWith('# session-'));
  if (isSession && data.logUrl && data.events) {
    delete (data as { events?: string }).events;
  }
}

/**
 * 分片重组后的 JSON 超过 CHUNK_JSON_MAX_BYTES 则拒绝入库，防止单条撑爆 gRPC。
 * @param {string} json
 */
export function assertChunkPayloadSize(json: string): void {
  if (Buffer.byteLength(json, 'utf8') > LOG_FIELD_LIMITS.CHUNK_JSON_MAX_BYTES) {
    throw new Error(
      `分片重组后 payload 超过 ${LOG_FIELD_LIMITS.CHUNK_JSON_MAX_BYTES} 字节`,
    );
  }
}
