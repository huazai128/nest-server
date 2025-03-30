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

  @IsString()
  @prop({ type: String, default: null })
  events: string | null;

  @IsString()
  @prop({ type: String, default: null, text: true, index: true })
  content: string;

  @IsNumber()
  @prop({ type: String, default: null, text: true, index: true })
  oId: string;

  /**
   * 额外信息依照不同项目存储不同内容，在后台用户日志上报页面显示，支持换行符
   */
  @IsString()
  @prop({ type: Object, default: null })
  extraInfo: object | null;

  @IsString()
  @prop({ type: String, default: null })
  traceId: string | null;
}

export const UserLogProvider = getProviderByTypegoose(UserLog);
