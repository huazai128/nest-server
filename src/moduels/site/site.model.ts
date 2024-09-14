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
import paginate from 'mongoose-paginate-v2';
import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsInt,
  IsDefined,
  IsUrl,
  IsArray,
} from 'class-validator';
import { PublishState, ReportStatus } from '@app/constants/enum.contant';

export const SITE_PUBLISH_STATES = [
  PublishState.Draft,
  PublishState.Published,
  PublishState.Recycle,
] as const;
export const SITE_REPOST_STATES = [
  ReportStatus.NotReport,
  ReportStatus.Report,
] as const;

class APIRule {
  @IsNotEmpty({ message: '告警规则的接口名称不能为空' })
  @prop({ type: String, required: true })
  apiUrlPattern: string; // 指定接口名称，传'*'时对所有接口生效

  @prop({ type: String })
  key?: string; // 指定需要检查的接口返回字段

  @prop({
    type: () => [Schema.Types.Mixed],
    default: undefined,
    allowMixed: Severity.ALLOW,
  })
  enums?: any[]; // 指定枚举值，接口对应字段如果在enums中不上报

  @prop({ type: Boolean })
  allowEmpty?: boolean; // true 空值不上报 false 空值上报

  @prop({ type: Boolean })
  ignore?: boolean; // true此api不上报
}

@index({ name: 'text', reportUrl: 'text' })
@plugin(AutoIncrementID, {
  field: 'id',
  incrementBy: 1,
  startAt: 1000000000,
  trackerCollection: 'identitycounters',
  trackerModelName: 'identitycounter',
})
@plugin(paginate)
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
  id?: number;

  @IsDefined()
  @IsString()
  @IsNotEmpty({ message: '站点名称不能为空？' })
  @prop({ required: true, validate: /\S+/, text: true, index: true }) // 添加索引
  name: string;

  @IsDefined()
  @IsIn(SITE_REPOST_STATES)
  @IsInt()
  @prop({ enum: ReportStatus, default: ReportStatus.Report })
  isApi: ReportStatus;

  @IsDefined()
  @IsString()
  @IsNotEmpty({ message: '上报告警接口不能为空？' })
  @IsUrl()
  @prop({ required: true, validate: /\S+/, text: true })
  reportUrl: string;

  @IsDefined()
  @IsIn(SITE_PUBLISH_STATES)
  @IsInt()
  @prop({ enum: PublishState, default: PublishState.Published, index: true })
  state: PublishState;

  // API上报告警屏蔽规则
  @prop({ default: [], type: () => [APIRule], _id: false })
  apiRules?: APIRule[];

  @prop({ default: Date.now, index: true, immutable: true })
  create_at?: Date;

  @prop({ default: Date.now })
  update_at?: Date;

  // 录屏白名单
  @IsArray()
  @prop({ default: [], type: () => [Number] })
  recordWhiteList?: number[];
}

export const SiteProvider = getProviderByTypegoose(Site);
