import { MongooseID, MongooseModel } from '@app/interfaces/mongoose.interface';
import { PaginateQuery } from '@app/interfaces/paginate.interface';
import { InjectModel } from '@app/transformers/model.transform';
import { Injectable } from '@nestjs/common';
import { FilterQuery, PaginateOptions, PipelineStage, Types } from 'mongoose';
import { NetworkSpeedLog } from './networkSpeedLog.model';
import { TransportCategory } from '@app/constants/enum.contant';
import { handleSearchKeys } from '@app/utils/searchCommon';
import { createLogger } from '@app/utils/logger';
import * as dayjs from 'dayjs';

const logger = createLogger({ scope: 'NetworkSpeedLogService', time: true });

const SPEED_JSON_KEYS = [
  'speedKBps',
  'networkLevel',
  'imageSizeBytes',
  'isWeakNetwork',
  'durationMs',
];

const KW_KEYS = ['eventCategory', 'eventAction', 'eventLabel', 'userId', 'ip'];

@Injectable()
export class NetworkSpeedLogService {
  constructor(
    @InjectModel(NetworkSpeedLog)
    private readonly speedModel: MongooseModel<NetworkSpeedLog>,
  ) {}

  isNetworkSpeedLog(data: Record<string, any>): boolean {
    if (String(data?.category) !== TransportCategory.CUSTOM) {
      return false;
    }
    const marker = `${data.eventCategory || ''} ${data.eventAction || ''}`;
    if (/network.?speed|netspeed|测速|speed-test/i.test(marker)) {
      return true;
    }
    const parsed = this.parseEventValue(data.eventValue);
    if (!parsed || typeof parsed !== 'object') {
      return false;
    }
    return SPEED_JSON_KEYS.some((key) => key in parsed);
  }

  normalize(data: Record<string, any>): NetworkSpeedLog {
    const parsed = this.parseEventValue(data.eventValue);
    const parseSuccess = !!parsed;
    const metrics = (parsed || {}) as Record<string, any>;
    return {
      ...data,
      eventCategory: data.eventCategory ?? null,
      eventAction: data.eventAction ?? null,
      eventLabel: data.eventLabel ?? null,
      eventId: Number(data.eventId) || 0,
      success: this.toBool(metrics.success),
      imageSizeBytes: this.toNum(metrics.imageSizeBytes),
      durationMs: this.toNum(metrics.durationMs),
      speedKBps: this.toNum(metrics.speedKBps),
      speedMbps: this.toNum(metrics.speedMbps),
      networkLevel: metrics.networkLevel ?? null,
      maxResourceSizeBytes: this.toNum(metrics.maxResourceSizeBytes),
      estimatedMaxResourceDownloadDurationMs: this.toNum(
        metrics.estimatedMaxResourceDownloadDurationMs,
      ),
      entryDurationMs: this.toNum(metrics.entryDurationMs),
      fcpDurationMs: this.toNum(metrics.fcpDurationMs),
      lcpDurationMs: this.toNum(metrics.lcpDurationMs),
      communityId: metrics.communityId ?? data.oId ?? null,
      communityName: metrics.communityName ?? null,
      orgId: metrics.orgId ?? null,
      orgName: metrics.orgName ?? null,
      teamId: metrics.teamId ?? null,
      isWeakNetwork: Boolean(metrics.isWeakNetwork),
      errorType: metrics.errorType ?? null,
      measuredAt: metrics.measuredAt
        ? new Date(metrics.measuredAt)
        : new Date(),
      parseSuccess,
      parseError: parseSuccess ? null : 'eventValue JSON 解析失败',
      rawEventValue:
        typeof data.eventValue === 'string'
          ? data.eventValue
          : data.eventValue
            ? JSON.stringify(data.eventValue)
            : null,
    } as unknown as NetworkSpeedLog;
  }

  shouldSendAlarm(data: NetworkSpeedLog): boolean {
    return (
      (data.mode === 'test' || data.mode === 'prod') &&
      data.parseSuccess === true &&
      data.success === true &&
      ['weak', 'severe', 'critical'].includes(data.networkLevel || '') &&
      (data.fcpDurationMs == null || data.fcpDurationMs > 1000)
    );
  }

  async create(data: NetworkSpeedLog): Promise<Types.ObjectId> {
    try {
      const res = await this.speedModel.create(data);
      return res._id;
    } catch (error) {
      logger.error('NetworkSpeedLog 保存失败', error);
      throw error;
    }
  }

  async paginate(
    paginateQuery: PaginateQuery<NetworkSpeedLog>,
    paginateOptions: PaginateOptions,
  ) {
    return this.speedModel.paginate(paginateQuery, paginateOptions);
  }

  async aggregation(pipeParams: PipelineStage[]) {
    return this.speedModel.aggregate(pipeParams).allowDiskUse(true);
  }

  async siteIdRemove(siteId: MongooseID) {
    return this.speedModel.deleteMany({ siteId }).exec();
  }

  buildMatch(query: Record<string, unknown>): FilterQuery<NetworkSpeedLog> {
    const match = handleSearchKeys<any>(query, KW_KEYS);
    if (query.success === 'true' || query.success === true) {
      match.success = true;
    } else if (query.success === 'false' || query.success === false) {
      match.success = false;
    }
    if (query.networkLevel) {
      match.networkLevel = query.networkLevel;
    }
    if (query.isWeakNetwork === 'true' || query.isWeakNetwork === true) {
      match.isWeakNetwork = true;
    } else if (
      query.isWeakNetwork === 'false' ||
      query.isWeakNetwork === false
    ) {
      match.isWeakNetwork = false;
    }
    if (query.isAlarm === 'true' || query.isAlarm === true) {
      match.mode = { $in: ['test', 'prod'] };
      match.parseSuccess = true;
      match.success = true;
      match.networkLevel = { $in: ['weak', 'severe', 'critical'] };
    }
    return match;
  }

  formatListItem(doc: Record<string, any>) {
    const item = { ...doc };
    if (item.create_at) {
      item.create_at = dayjs(item.create_at).format('YYYY-MM-DD HH:mm:ss');
    }
    if (item.update_at) {
      item.update_at = dayjs(item.update_at).format('YYYY-MM-DD HH:mm:ss');
    }
    if (item.measuredAt) {
      item.measuredAt = dayjs(item.measuredAt).format('YYYY-MM-DD HH:mm:ss');
    }
    if (item._id) {
      item._id = String(item._id);
    }
    return item;
  }

  private parseEventValue(value: unknown): Record<string, any> | null {
    if (!value) {
      return null;
    }
    if (typeof value === 'object') {
      return value as Record<string, any>;
    }
    if (typeof value !== 'string') {
      return null;
    }
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  private toNum(value: unknown): number | null {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private toBool(value: unknown): boolean | null {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return null;
  }
}
