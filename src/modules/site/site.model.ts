import { getProviderByTypegoose } from '@app/transformers/model.transform';
import {
  prop,
  plugin,
  modelOptions,
  index,
  Severity,
} from '@typegoose/typegoose';
import { Schema } from 'mongoose';
import { AutoIncrementID } from '@typegoose/auto-increment';
import * as paginate from 'mongoose-paginate-v2';
import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsInt,
  IsDefined,
  IsUrl,
  IsArray,
  IsOptional,
} from 'class-validator';
import { PublishState, ReportStatus } from '@app/constants/enum.contant';

// 站点发布状态枚举值
export const SITE_PUBLISH_STATES = [
  PublishState.Draft, // 草稿
  PublishState.Published, // 已发布
  PublishState.Recycle, // 回收站
] as const;

// 站点上报状态枚举值
export const SITE_REPOST_STATES = [
  ReportStatus.NotReport, // 不上报
  ReportStatus.Report, // 上报
] as const;

/**
 * API告警规则配置类
 */
class APIRule {
  @IsNotEmpty({ message: '告警规则的接口名称不能为空' })
  @IsString()
  @prop({ type: String, required: true, trim: true })
  apiUrlPattern: string; // 指定接口名称，传'*'时对所有接口生效

  @IsOptional()
  @IsString()
  @prop({ type: String, trim: true })
  key?: string; // 指定需要检查的接口返回字段

  @IsOptional()
  @IsArray()
  @prop({
    type: () => [Schema.Types.Mixed],
    default: undefined,
    allowMixed: Severity.ALLOW,
  })
  enums?: any[]; // 指定枚举值，接口对应字段如果在enums中不上报

  @IsOptional()
  @prop({ type: Boolean, default: false })
  allowEmpty?: boolean; // true 空值不上报 false 空值上报

  @IsOptional()
  @prop({ type: Boolean, default: false })
  ignore?: boolean; // true此api不上报
}

/**
 * 站点模型定义
 */
@index({ name: 'text', reportUrl: 'text' }) // 为name和reportUrl字段创建文本索引
@plugin(AutoIncrementID, {
  field: 'id',
  incrementBy: 1,
  startAt: 1000000000,
  trackerCollection: 'identitycounters',
  trackerModelName: 'identitycounter',
})
@plugin(paginate) // 添加分页插件
@modelOptions({
  schemaOptions: {
    toObject: { getters: true },
    timestamps: {
      createdAt: 'create_at',
      updatedAt: 'update_at',
    },
  },
})
export class Site {
  @prop({ unique: true })
  id?: number; // 站点唯一标识ID

  @IsDefined()
  @IsString()
  @IsNotEmpty({ message: '站点名称不能为空' })
  @prop({
    required: true,
    validate: /\S+/,
    text: true,
    index: true,
    trim: true,
  })
  name: string; // 站点名称

  @IsDefined()
  @IsIn(SITE_REPOST_STATES)
  @IsInt()
  @prop({
    enum: ReportStatus,
    default: ReportStatus.Report,
    index: true,
  })
  isApi: ReportStatus; // API上报状态

  @IsDefined()
  @IsString()
  @IsNotEmpty({ message: '上报告警接口URL不能为空' })
  @IsUrl()
  @prop({
    required: true,
    validate: /\S+/,
    text: true,
    trim: true,
  })
  reportUrl: string; // 告警上报接口URL

  @IsDefined()
  @IsString()
  @IsNotEmpty({ message: '用户反馈接口URL不能为空' })
  @IsUrl()
  @prop({
    required: true,
    validate: /\S+/,
    text: true,
    trim: true,
  })
  feedbackUrl?: string; // 反馈接口URL

  @IsDefined()
  @IsIn(SITE_PUBLISH_STATES)
  @IsInt()
  @prop({
    enum: PublishState,
    default: PublishState.Published,
    index: true,
  })
  state: PublishState; // 站点发布状态

  @IsOptional()
  @IsArray()
  @prop({
    default: [],
    type: () => [APIRule],
    _id: false,
  })
  apiRules?: APIRule[]; // API上报告警屏蔽规则列表

  @prop({
    default: Date.now,
    index: true,
    immutable: true,
  })
  create_at?: Date; // 创建时间

  @prop({ default: Date.now })
  update_at?: Date; // 更新时间

  @IsOptional()
  @IsArray()
  @prop({
    default: [],
    type: () => [Number],
    validate: {
      validator: (v: number[]) => v.every((n) => Number.isInteger(n) && n > 0),
      message: '白名单ID必须为正整数',
    },
  })
  recordWhiteList?: number[]; // 录屏白名单ID列表
}

// 导出Site Provider用于依赖注入
export const SiteProvider = getProviderByTypegoose(Site);
