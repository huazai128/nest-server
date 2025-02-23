import { getProviderByTypegoose } from '@app/transformers/model.transform';
import { indexOptions, indexWeights, Report } from '@app/utils/report';
import { AutoIncrementID } from '@typegoose/auto-increment';
import { modelOptions, prop, plugin, index } from '@typegoose/typegoose';
import { IsString, IsNumber, IsDate } from 'class-validator';
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
  @IsNumber()
  @prop({ unique: true })
  id: number;

  @IsDate()
  @prop({
    default: Date.now,
    index: true,
    immutable: true,
    required: true,
  })
  create_at: Date;

  @IsDate()
  @prop({
    default: Date.now,
    required: true,
  })
  update_at: Date;

  @IsString()
  @prop({
    type: String,
    default: null,
    trim: true,
    index: true,
    description: '追踪ID,用于链路追踪',
  })
  traceId: string | null;
}

export const PvLogProvider = getProviderByTypegoose(PvLog);
