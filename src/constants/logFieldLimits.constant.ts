/** 与 protos/common/log_field_limits.proto 保持一致 */
export const LOG_FIELD_LIMITS = {
  /** Mongo 带索引字符串键上限（字节） */
  INDEXED_STRING_MAX_BYTES: 900,
  VALUE_MAX_BYTES: 8000,
  RESPONSE_RESULT_MAX_BYTES: 2000,
  EVENTS_MAX_BYTES: 3 * 1024 * 1024,
  UA_MAX_BYTES: 2048,
  CONTENT_MAX_BYTES: 16_000,
  LOG_DATA_MAX_BYTES: 32_000,
  NODE_DOM_MAX_BYTES: 4000,
  CHUNK_JSON_MAX_BYTES: 4 * 1024 * 1024,
  /** Number.MAX_SAFE_INTEGER */
  MEMORY_METRIC_MAX: 9_007_199_254_740_991,
  GRPC_STRING_WARN_BYTES: 512 * 1024,
} as const;

export function truncateUtf8ByBytes(
  value: string,
  maxBytes: number,
  suffix = '…',
): string {
  if (Buffer.byteLength(value, 'utf8') <= maxBytes) {
    return value;
  }
  const suffixBytes = Buffer.byteLength(suffix, 'utf8');
  let end = value.length;
  while (
    end > 0 &&
    Buffer.byteLength(value.slice(0, end), 'utf8') + suffixBytes > maxBytes
  ) {
    end -= 1;
  }
  return end > 0 ? `${value.slice(0, end)}${suffix}` : suffix;
}

/** int64 / 超大数字在 JS 与 Mongo Number 下的安全入库值 */
export function clampMemoryMetric(value: unknown): number {
  const n = typeof value === 'string' ? Number(value) : Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return 0;
  }
  return Math.min(Math.floor(n), LOG_FIELD_LIMITS.MEMORY_METRIC_MAX);
}

export function clampInt32(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.max(-2147483648, Math.min(2147483647, Math.trunc(n)));
}
