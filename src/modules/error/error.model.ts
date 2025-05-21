import { getProviderByTypegoose } from '@app/transformers/model.transform';
import { indexOptions, indexWeights, Report } from '@app/utils/report';
import { AutoIncrementID } from '@typegoose/auto-increment';
import {
  index,
  modelOptions,
  prop,
  plugin,
  Severity,
} from '@typegoose/typegoose';
import { IsString, IsArray, IsNumber, IsUrl } from 'class-validator';
import * as paginate from 'mongoose-paginate-v2';
import { ApiLog, Response } from '../api/api.model';
import { CustomLog } from '../customLog/customLog.model';
import { EventLog } from '../eventLog/eventLog.model';
import * as aggregatePaginate from 'mongoose-aggregate-paginate-v2';
import { Method } from 'axios';
import mongoose from 'mongoose';

export type BreadcrumbsType = CustomLog | ApiLog | EventLog;

export class Meta {
  @IsNumber()
  @prop({ type: Number, default: 0 })
  col: number;

  @IsString()
  @IsUrl()
  @prop({ type: String, default: null, index: true })
  file: string | null;

  @IsNumber()
  @prop({ type: Number, default: 0 })
  row: number;

  @IsString()
  @prop({ type: String, default: null })
  method: Method | null;

  @IsString()
  @IsUrl()
  @prop({ type: String, default: null, index: true })
  url: string | null;

  @prop({
    allowMixed: Severity.ALLOW,
    type: () => mongoose.Schema.Types.Mixed,
    default: undefined,
    select: false, // 默认不查询此字段，提高查询性能
  })
  body: object | null;

  @IsNumber()
  @prop({ type: Number, default: 0 })
  requestTime: number;

  @IsNumber()
  @prop({ type: Number, default: 0 })
  responseTime: number;

  @IsNumber()
  @prop({ type: Number, default: 0, index: true })
  status: number;

  @IsString()
  @prop({ type: String, default: null })
  statusText: string | null;

  @prop({ type: () => Response, _id: false, default: null, select: false }) // 默认不查询此字段
  response: Response | null;

  @prop({
    allowMixed: Severity.ALLOW,
    type: () => mongoose.Schema.Types.Mixed,
    default: undefined,
    select: false, // 默认不查询此字段
  })
  params: object | null;

  @IsString()
  @prop({ type: String, default: null, index: true })
  conponentName: string | null;
}

export class StackTrace {
  @IsNumber()
  @prop({ type: Number, default: 0 })
  colno: number;

  @IsUrl()
  @prop({ type: String, default: null, index: true })
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
  @prop({ _id: false, default: [], select: false }) // 默认不查询此字段，按需加载
  breadcrumbs: Array<BreadcrumbsType>;

  @prop({ _id: false, default: {}, type: () => Meta })
  meta: Meta;

  @IsArray()
  @prop({ _id: false, default: [], type: () => [StackTrace], select: false }) // 默认不查询此字段
  stackTrace: Array<StackTrace>;

  @IsString()
  @prop({ type: String, default: null, index: true })
  errorType: string | null;

  @IsString()
  @prop({ type: String, default: null, index: true })
  value: string | null;

  @IsString()
  @prop({ type: String, default: null, select: false }) // 默认不查询此字段
  errorDetail: string | null;

  @IsString()
  @prop({ type: String, default: null, select: false }) // 默认不查询此字段
  events: string | null;
}

@index(
  {
    ...indexOptions,
    file: 'text',
    value: 'text',
    'meta.file': 'text',
    'meta.url': 'text',
  },
  {
    name: 'SearchIndex',
    weights: {
      ...indexWeights,
      'meta.file': 16,
      'meta.url': 5,
      file: 10,
      value: 4,
    },
    background: true, // 后台创建索引，不阻塞操作
  },
)
@index({ siteId: 1, create_at: -1 })
@index({ reportsType: 1, create_at: -1 })
@index({ errorType: 1, value: 1 })
// 添加常用查询组合的复合索引
@index({ siteId: 1, errorType: 1, create_at: -1 })
@index({ siteId: 1, reportsType: 1, create_at: -1 })
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
    autoIndex: true,
  },
})
export class ErrorLog extends ErrorDto {
  @prop({ unique: true, index: true }) // 确保id有索引
  id: number;

  @prop({ default: Date.now, index: true, immutable: true })
  create_at?: Date;

  @prop({ default: Date.now })
  update_at?: Date;
}

export const ErrorLogProvider = getProviderByTypegoose(ErrorLog);
