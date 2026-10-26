import { getProviderByTypegoose } from '@app/transformers/model.transform';
import { indexOptions, indexWeights, Report } from '@app/utils/report';
import { AutoIncrementID } from '@typegoose/auto-increment';
import { index, modelOptions, plugin, prop, Severity } from '@typegoose/typegoose';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import * as aggregatePaginate from 'mongoose-aggregate-paginate-v2';
import * as paginate from 'mongoose-paginate-v2';

@index(
  { ...indexOptions },
  {
    name: 'SearchIndex',
    weights: {
      ...indexWeights,
      eventCategory: 8,
      eventAction: 8,
    },
  },
)
@index({ siteId: 1, create_at: -1 })
@index({ networkLevel: 1, create_at: -1 })
@index({ isWeakNetwork: 1, create_at: -1 })
@plugin(AutoIncrementID, {
  field: 'id',
  incrementBy: 1,
  startAt: 1000000000,
  trackerCollection: 'identitycounters',
  trackerModelName: 'identitycounter',
})
@plugin(paginate)
@plugin(aggregatePaginate)
@modelOptions({
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: {
    toObject: { getters: true },
    timestamps: {
      createdAt: 'create_at',
      updatedAt: 'update_at',
    },
  },
})
export class NetworkSpeedLog extends Report {
  @prop({ unique: true })
  id: number;

  @IsString()
  @prop({ type: String, default: null, index: true })
  eventCategory: string | null;

  @IsString()
  @prop({ type: String, default: null, index: true })
  eventAction: string | null;

  @IsString()
  @prop({ type: String, default: null })
  eventLabel: string | null;

  @IsNumber()
  @prop({ type: Number, default: 0, index: true })
  eventId: number;

  @IsOptional()
  @IsBoolean()
  @prop({ type: Boolean, default: null, index: true })
  success: boolean | null;

  @IsOptional()
  @IsNumber()
  @prop({ type: Number, default: null })
  imageSizeBytes: number | null;

  @IsOptional()
  @IsNumber()
  @prop({ type: Number, default: null })
  durationMs: number | null;

  @IsOptional()
  @IsNumber()
  @prop({ type: Number, default: null })
  speedKBps: number | null;

  @IsOptional()
  @IsNumber()
  @prop({ type: Number, default: null })
  speedMbps: number | null;

  @IsOptional()
  @IsString()
  @prop({ type: String, default: null, index: true })
  networkLevel: string | null;

  @IsOptional()
  @IsNumber()
  @prop({ type: Number, default: null })
  maxResourceSizeBytes: number | null;

  @IsOptional()
  @IsNumber()
  @prop({ type: Number, default: null })
  estimatedMaxResourceDownloadDurationMs: number | null;

  @IsOptional()
  @IsNumber()
  @prop({ type: Number, default: null })
  entryDurationMs: number | null;

  @IsOptional()
  @IsNumber()
  @prop({ type: Number, default: null })
  fcpDurationMs: number | null;

  @IsOptional()
  @IsNumber()
  @prop({ type: Number, default: null })
  lcpDurationMs: number | null;

  @IsOptional()
  @IsString()
  @prop({ type: String, default: null })
  communityId: string | null;

  @IsOptional()
  @IsString()
  @prop({ type: String, default: null })
  communityName: string | null;

  @IsOptional()
  @IsString()
  @prop({ type: String, default: null })
  orgId: string | null;

  @IsOptional()
  @IsString()
  @prop({ type: String, default: null })
  orgName: string | null;

  @IsOptional()
  @IsString()
  @prop({ type: String, default: null })
  teamId: string | null;

  @IsOptional()
  @IsBoolean()
  @prop({ type: Boolean, default: false, index: true })
  isWeakNetwork: boolean;

  @IsOptional()
  @IsString()
  @prop({ type: String, default: null })
  errorType: string | null;

  @IsOptional()
  @prop({ type: Date, default: null })
  measuredAt: Date | null;

  @IsOptional()
  @IsBoolean()
  @prop({ type: Boolean, default: true })
  parseSuccess: boolean;

  @IsOptional()
  @IsString()
  @prop({ type: String, default: null })
  parseError: string | null;

  @IsOptional()
  @IsString()
  @prop({ type: String, default: null })
  rawEventValue: string | null;

  @prop({ default: Date.now, immutable: true, index: true })
  create_at?: Date;

  @prop({ default: Date.now })
  update_at?: Date;
}

export const NetworkSpeedLogProvider = getProviderByTypegoose(NetworkSpeedLog);
