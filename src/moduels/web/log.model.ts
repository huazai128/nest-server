import { getProviderByTypegoose } from '@app/transformers/model.transform';
import {
  prop,
  plugin,
  modelOptions,
  index,
  Ref,
  Severity,
} from '@typegoose/typegoose';
import { AutoIncrementID } from '@typegoose/auto-increment';
import * as paginate from 'mongoose-paginate-v2';
import {
  IsNotEmpty,
  IsIn,
  IsString,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsUrl,
  IsIP,
} from 'class-validator';
import { Site } from '../site/site.model';
import mongoose from 'mongoose';
import * as aggregatePaginate from 'mongoose-aggregate-paginate-v2';
import { Method } from 'axios';
import {
  LOG_CATEGORY,
  MechanismTypes,
  MetricsName,
  MetricsTypes,
  TransportCategory,
} from '@app/constants/enum.contant';

export type Content = { name: string };

export enum RefType {
  ApiLog = 'ApiLog',
  EventLog = 'EventLog',
  ErrorLog = 'ErrorLog',
  PrefLog = 'PrefLog',
  PvLog = 'PvLog',
  CustomLog = 'CustomLog',
  UserLog = 'UserLog',
}

export const LOG_REF_TYPE = [
  RefType.ApiLog,
  RefType.EventLog,
  RefType.ErrorLog,
  RefType.EventLog,
  RefType.PrefLog,
  RefType.PvLog,
  RefType.UserLog,
];

@index(
  { title: 'text', href: 'text', url: 'text', value: 'text', create_at: 1 },
  {
    name: 'SearchIndex',
    weights: {
      url: 6,
      value: 5,
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
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: {
    toObject: { getters: true },
    timestamps: {
      createdAt: 'create_at',
      updatedAt: 'update_at',
    },
  },
})
export class Log {
  @prop({ unique: true }) // 设置唯一索引
  id: number;

  @IsIn([...MetricsTypes, ...MechanismTypes])
  @IsString()
  @prop({ enum: MetricsName, index: true, default: MetricsName.HT })
  reportsType: MetricsName;

  @IsString()
  @prop({ type: String, default: null })
  errorUUid?: string | null;

  @IsNotEmpty()
  @prop({ ref: () => Site, required: true, index: true })
  siteId: Ref<Site>;

  @IsIn([LOG_REF_TYPE])
  @prop({ required: true, enum: RefType, addNullToEnum: true })
  onModel: RefType;

  @IsNotEmpty()
  @prop({ refPath: 'onModel', required: true })
  doce: Ref<Content>;

  @IsIn([LOG_CATEGORY])
  @IsString()
  @prop({
    enum: TransportCategory,
    required: true,
    default: TransportCategory.API,
  })
  category: TransportCategory;

  @IsNumber()
  @IsNumberString()
  @IsOptional()
  @prop({ type: String, default: null, index: true })
  userId: string | null;

  @IsString()
  @prop({ default: null, validate: /\S+/, text: true, type: String })
  title: string | null;

  @IsString()
  @prop({ type: String, default: null, index: true })
  path: string | null;

  @IsString()
  @IsUrl()
  @IsOptional()
  @prop({ type: String, default: null, index: true, text: true })
  href: string | null;

  @IsString()
  @prop({ type: String, default: null })
  method?: Method | null;

  @IsString()
  @IsUrl()
  @IsOptional()
  @prop({ type: String, default: null, index: true, text: true })
  url: string | null;

  // body请求参数
  @prop({
    allowMixed: Severity.ALLOW,
    type: () => mongoose.Schema.Types.Mixed,
    default: undefined,
    text: true,
  })
  body: object | null;

  // get请求参数
  @prop({
    allowMixed: Severity.ALLOW,
    type: () => mongoose.Schema.Types.Mixed,
    default: undefined,
    text: true,
  })
  params: object | null;

  @prop({ type: () => Response, _id: false, default: null })
  response: Response | null;

  @IsString()
  @prop({ type: String, default: null, text: true, index: true })
  value?: string | null; // 错误信息

  @IsIP()
  @IsOptional()
  @prop({ default: null, type: String, index: true })
  ip: string | null;

  @prop({ default: Date.now, immutable: true, index: true })
  create_at?: Date;

  @prop({ default: Date.now })
  update_at?: Date;

  @IsString()
  @prop({ type: String, default: null })
  traceId: string | null;
}

export const LogProvider = getProviderByTypegoose(Log);
