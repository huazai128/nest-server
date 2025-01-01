import { getProviderByTypegoose } from '@app/transformers/model.transform';
import { indexOptions, indexWeights, Report } from '@app/utils/report';
import { AutoIncrementID } from '@typegoose/auto-increment';
import { index, modelOptions, prop, plugin } from '@typegoose/typegoose';
import { IsString, IsArray, IsNumber, IsUrl } from 'class-validator';
import * as paginate from 'mongoose-paginate-v2';
import { ApiLog, Response } from '../api/api.model';
import { CustomLog } from '../customLog/customLog.model';
import { EventLog } from '../eventLog/eventLog.model';
import * as aggregatePaginate from 'mongoose-aggregate-paginate-v2';
import { Method } from 'axios';

export type BreadcrumbsType = CustomLog | ApiLog | EventLog;

export class Meta {
  @IsNumber()
  @prop({ type: Number, default: 0 })
  col: number;

  @IsString()
  @IsUrl()
  @prop({ type: String, default: null, text: true })
  file: string | null;

  @IsNumber()
  @prop({ type: Number, default: 0 })
  row: number;

  @IsString()
  @prop({ type: String, default: null })
  method: Method | null;

  @IsString()
  @IsUrl()
  @prop({ type: String, default: null, text: true })
  url: string | null;

  @IsString()
  @prop({ type: String, default: null, text: true })
  body: string | null;

  @IsNumber()
  @prop({ type: Number, default: 0 })
  requestTime: number;

  @IsNumber()
  @prop({ type: Number, default: 0 })
  responseTime: number;

  @IsNumber()
  @prop({ type: Number, default: 0 })
  status: number;

  @IsString()
  @prop({ type: String, default: null })
  statusText: string | null;

  @prop({ type: () => Response, _id: false, default: null })
  response: Response | null;

  @IsString()
  @prop({ type: String, default: null, text: true })
  params: string | null;

  @IsString()
  @prop({ type: String, default: null })
  conponentName: string | null;

  @IsString()
  @prop({ type: String, default: null })
  traceId: string | null;
}

export class StackTrace {
  @IsNumber()
  @prop({ type: Number, default: 0 })
  colno: number;

  @IsUrl()
  @prop({ type: String, default: null })
  filename: string | null;

  @IsString()
  @prop({ type: String, default: null })
  functionName: string | null;

  @IsNumber()
  @prop({ type: Number, default: 0 })
  lineno: number;
}

export class ErrorDto extends Report {
  @IsArray()
  @prop({ _id: false, default: [] })
  breadcrumbs: Array<BreadcrumbsType>;

  @prop({ _id: false, default: {}, type: () => Meta })
  meta: Meta;

  @IsArray()
  @prop({ _id: false, default: [], type: () => [StackTrace] })
  stackTrace: Array<StackTrace>;

  @IsString()
  @prop({ type: String, default: null, index: true })
  errorType: string | null;

  @IsString()
  @prop({ type: String, default: null, index: true, text: true })
  value: string | null;

  @IsString()
  @prop({ type: String, default: null, text: true })
  errorDetail: string | null;

  @IsString()
  @prop({ type: String, default: null })
  errorUUid: string | null;

  @IsString()
  @prop({ type: String, default: null })
  events: string | null;
}

@index(
  {
    ...indexOptions,
    file: 'text',
    value: 'text',
    'meta.file': 'text',
    'meta.url': 'text',
    'meta.body': 'text',
    'meta.params': 'text',
  },
  {
    name: 'SearchIndex',
    weights: {
      ...indexWeights,
      'meta.file': 16,
      'meta.url': 5,
      'meta.body': 14,
      'meta.params': 14,
      file: 10,
      value: 4,
    },
  },
)
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
  schemaOptions: {
    toObject: { getters: true },
    timestamps: {
      createdAt: 'create_at',
      updatedAt: 'update_at',
    },
  },
})
export class ErrorLog extends ErrorDto {
  @prop({ unique: true }) // 设置唯一索引
  id: number;

  @prop({ default: Date.now, index: true, immutable: true })
  create_at?: Date;

  @prop({ default: Date.now })
  update_at?: Date;
}

export const ErrorLogProvider = getProviderByTypegoose(ErrorLog);
