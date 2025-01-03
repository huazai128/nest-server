import { getProviderByTypegoose } from '@app/transformers/model.transform';
import { indexOptions, indexWeights, Report } from '@app/utils/report';
import { AutoIncrementID } from '@typegoose/auto-increment';
import { modelOptions, prop, plugin, index } from '@typegoose/typegoose';
import { IsString } from 'class-validator';
import * as aggregatePaginate from 'mongoose-aggregate-paginate-v2';
import * as paginate from 'mongoose-paginate-v2';

@index(
  { ...indexOptions },
  {
    name: 'SearchIndex',
    weights: {
      ...indexWeights,
      text: 18,
      logName: 10,
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
  schemaOptions: {
    toObject: { getters: true },
    timestamps: {
      createdAt: 'create_at',
      updatedAt: 'update_at',
    },
  },
})
export class PvLog extends Report {
  @prop({ unique: true })
  id: number;

  @prop({ default: Date.now, index: true, immutable: true })
  create_at?: Date;

  @prop({ default: Date.now })
  update_at?: Date;

  @IsString()
  @prop({ type: String, default: null })
  traceId: string | null;

  @IsString()
  @prop({ type: String, default: null })
  monitorId: string | null; // 用于记录用户行为，用于错误排查
}

export const PvLogProvider = getProviderByTypegoose(PvLog);
