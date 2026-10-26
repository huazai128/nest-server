import { getProviderByTypegoose } from '@app/transformers/model.transform';
import { indexOptions, indexWeights, Report } from '@app/utils/report';
import { AutoIncrementID } from '@typegoose/auto-increment';
import {
  modelOptions,
  prop,
  plugin,
  index,
  Severity,
} from '@typegoose/typegoose';
import { IsNumber, IsString } from 'class-validator';
import * as paginate from 'mongoose-paginate-v2';

@index(
  { ...indexOptions },
  {
    name: 'SearchIndex',
    weights: {
      ...indexWeights,
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
export class UserLog extends Report {
  @prop({ unique: true }) // 设置唯一索引
  id: number;

  @prop({ default: Date.now, immutable: true })
  create_at?: Date;

  @prop({ default: Date.now })
  update_at?: Date;

  /** 历史兼容：会话 .log 正文已改走 OSS，默认不查询 */
  @IsString()
  @prop({ type: String, default: null, select: false })
  events: string | null;

  /** 会话 .log 文件名，如 session-traceId-user-feedback.log */
  @IsString()
  @prop({ type: String, default: null })
  logName: string | null;

  /** 会话 .log 的阿里云 OSS 链接 */
  @IsString()
  @prop({ type: String, default: null })
  logUrl: string | null;

  @IsString()
  @prop({ type: String, default: null, text: true, index: true })
  content: string;

  @IsNumber()
  @prop({ type: String, default: null, text: true, index: true })
  oId: string; // 用户上报系统中id 如团队id 等；

  /**
   * 额外信息依照不同项目存储不同内容，在后台用户日志上报页面显示，支持换行符
   */
  @IsString()
  @prop({ type: Object, default: null })
  extraInfo: object | null;

  @prop({ type: Object, default: null })
  otherInfo?: Record<string, any>;

  @IsString()
  @prop({ type: String, default: null })
  traceId: string | null;
}

export const UserLogProvider = getProviderByTypegoose(UserLog);
