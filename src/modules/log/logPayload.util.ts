import { SaveLogRequest } from '@app/protos/log';
import {
  LOG_FIELD_LIMITS,
  clampInt32,
  clampMemoryMetric,
  truncateUtf8ByBytes,
} from '@app/constants/logFieldLimits.constant';
import { isObject } from 'lodash';

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
] as const;

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
];

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
 * gRPC / Kafka 入站 SaveLogRequest 归一化：类型安全、长度裁剪、索引字段预处理。
 */
export function normalizeInboundSaveLog(
  input: SaveLogRequest,
): SaveLogRequest {
  const data = { ...input } as SaveLogRequest & Record<string, unknown>;

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

  return data;
}

export function assertChunkPayloadSize(json: string): void {
  if (Buffer.byteLength(json, 'utf8') > LOG_FIELD_LIMITS.CHUNK_JSON_MAX_BYTES) {
    throw new Error(
      `分片重组后 payload 超过 ${LOG_FIELD_LIMITS.CHUNK_JSON_MAX_BYTES} 字节`,
    );
  }
}
