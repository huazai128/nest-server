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

// 定义内容类型接口
export type Content = { name: string };

// 定义日志引用类型枚举
export enum RefType {
  ApiLog = 'ApiLog', // API日志
  EventLog = 'EventLog', // 事件日志
  ErrorLog = 'ErrorLog', // 错误日志
  PrefLog = 'PrefLog', // 性能日志
  PvLog = 'PvLog', // 页面访问日志
  CustomLog = 'CustomLog', // 自定义日志
  UserLog = 'UserLog', // 用户行为日志
}

// 日志引用类型常量
export const LOG_REF_TYPE = [
  RefType.ApiLog,
  RefType.EventLog,
  RefType.ErrorLog,
  RefType.PrefLog,
  RefType.PvLog,
  RefType.UserLog,
];

// 1. 分离text索引
@index(
  { title: 'text', href: 'text', url: 'text', value: 'text' },
  {
    name: 'TextSearchIndex',
    weights: {
      url: 6,
      value: 5,
      title: 4,
      href: 3,
    },
    background: true,
  },
)
// 2. 针对游标分页的查询优化
@index({ id: 1 }) // 主键索引
// 3. 常用查询条件的组合索引
@index({ category: 1, create_at: -1 })
@index({ siteId: 1, create_at: -1 })
@index({ reportsType: 1, create_at: -1 })
// 4. 针对分组查询的索引
@index({ userId: 1 })
@index({ monitorId: 1 })
// 针对聚合常用的过滤和分组字段建立复合索引
@index({ siteId: 1, category: 1, reportsType: 1, create_at: 1 })
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
  @prop({ unique: true, index: true }) // 添加索引提升查询性能
  id: number;

  @IsIn([...MetricsTypes, ...MechanismTypes])
  @IsString()
  @prop({ enum: MetricsName, index: true, default: MetricsName.HT })
  reportsType: MetricsName;

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
    index: true, // 添加索引提升分类查询性能
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
    default: null,
    select: false,
  })
  body: object | null;

  // get请求参数
  @prop({
    allowMixed: Severity.ALLOW,
    type: () => mongoose.Schema.Types.Mixed,
    default: null, // 修改默认值为null
    select: false,
  })
  params: object | null;

  @prop({ type: () => Response, _id: false, default: null, select: false })
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
  @prop({ type: String, default: null, index: true }) // 添加索引提升追踪查询性能
  traceId: string | null;

  @IsString()
  @prop({ type: String, default: null, index: true }) // 添加索引提升监控查询性能
  monitorId: string | null; // 用于记录用户行为，用于错误排查

  @IsString()
  @prop({ type: String, default: null, index: true }) // 添加索引提升监控查询性能
  pageId: string | null; // 用于当前页面
}

export const LogProvider = getProviderByTypegoose(Log);
