import { getProviderByTypegoose } from '@app/transformers/model.transform';
import { indexOptions, indexWeights, Report } from '@app/utils/report';
import { AutoIncrementID } from '@typegoose/auto-increment';
import { index, modelOptions, prop, plugin } from '@typegoose/typegoose';
import { IsString, IsArray } from 'class-validator';
import * as paginate from 'mongoose-paginate-v2';

export class EventDto extends Report {
  @IsString()
  @prop({ type: String, default: '', text: true })
  tagText: string;

  @IsString()
  @prop({ type: String, default: null, index: true, optional: true })
  tagName: string;

  @IsString()
  @prop({ type: String, default: null, text: true, optional: true })
  nodeDom: string;

  @IsString()
  @prop({ type: String, default: null, index: true, optional: true })
  nodeId?: string;

  @IsArray()
  @prop({ type: () => [String], default: [] })
  classList: string[];

  @IsString()
  @prop({
    type: String,
    default: null,
    validate: /\S+/,
    text: true,
    optional: true,
  })
  logName: string;

  @IsString()
  @prop({ type: String, default: null, optional: true })
  logData: string;

  @IsString()
  @prop({ type: String, default: null, optional: true })
  logPos: string;

  @IsString()
  @prop({ type: String, default: null, optional: true })
  logId: string;
}

@index(
  { ...indexOptions, tagText: 'text', logName: 'text', nodeDom: 'text' },
  {
    name: 'SearchIndex',
    weights: {
      ...indexWeights,
      tagText: 18,
      logName: 10,
      nodeDom: 16,
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
  schemaOptions: {
    toObject: { getters: true },
    timestamps: {
      createdAt: 'create_at',
      updatedAt: 'update_at',
    },
  },
})
export class EventLog extends EventDto {
  @prop({ unique: true }) // 设置唯一索引
  id: number;

  @prop({ default: Date.now, index: true, immutable: true })
  create_at?: Date;

  @prop({ default: Date.now })
  update_at?: Date;
}

export const EventLogProvider = getProviderByTypegoose(EventLog);
