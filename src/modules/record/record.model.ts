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
  Ref,
} from '@typegoose/typegoose';
import { IsNotEmpty, IsString } from 'class-validator';
import * as paginate from 'mongoose-paginate-v2';
import { Site } from '../site/site.model';

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

  @IsNotEmpty()
  @IsString()
  @prop({ required: true })
  monitorId: string;

  @IsNotEmpty()
  @IsString()
  @prop({ required: true, type: String, text: true, index: true })
  events: string;

  @IsNotEmpty()
  @IsString()
  @prop({ type: String, default: null })
  traceId: string | null;

  @IsNotEmpty()
  @IsString()
  @prop({ type: String, default: null })
  pageId: string | null;

  @IsNotEmpty()
  @prop({ ref: () => Site, required: true, index: true })
  siteId: Ref<Site>;
}

export const RecordModel = getModelForClass(Record);
export const RecordProvider = getProviderByTypegoose(Record);
