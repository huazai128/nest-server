import { getProviderByTypegoose } from '@app/transformers/model.transform';
import { indexOptions, indexWeights, Report } from '@app/utils/report';
import { AutoIncrementID } from '@typegoose/auto-increment';
import {
  modelOptions,
  prop,
  plugin,
  index,
  Severity,
  getModelForClass,
} from '@typegoose/typegoose';
import { IsString } from 'class-validator';
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
export class Record extends Report {
  @prop({ unique: true })
  id: number;

  @prop({ default: Date.now, immutable: true })
  create_at?: Date;

  @prop({ default: Date.now })
  update_at?: Date;

  @IsString()
  @prop({ required: true })
  monitorId: string;

  @IsString()
  @prop({ required: true, type: String, text: true, index: true })
  events: string;

  @IsString()
  @prop({ type: String, default: null })
  traceId: string | null;
}

export const RecordModel = getModelForClass(Record);
export const RecordProvider = getProviderByTypegoose(Record);
