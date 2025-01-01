import { getProviderByTypegoose } from '@app/transformers/model.transform';
import { indexOptions, indexWeights, Report } from '@app/utils/report';
import { AutoIncrementID } from '@typegoose/auto-increment';
import { index, modelOptions, prop, plugin } from '@typegoose/typegoose';
import { IsString, IsNumber, IsNumberString } from 'class-validator';
import * as mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';
import * as paginate from 'mongoose-paginate-v2';

export class CustomDto extends Report {
  @IsString()
  @prop({ default: null, index: true, text: true })
  eventCategory: string;

  @IsString()
  @prop({ default: null, text: true, index: true })
  eventAction: string;

  @IsString()
  @prop({ default: null, text: true })
  eventLabel: string;

  @IsString()
  @prop({ default: null, text: true, index: true })
  eventValue?: string;

  @IsNumber()
  @IsNumberString()
  @prop({ default: 0, index: true })
  eventId: number;
}

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
@plugin(mongooseAggregatePaginate)
@modelOptions({
  schemaOptions: {
    toObject: { getters: true },
    timestamps: {
      createdAt: 'create_at',
      updatedAt: 'update_at',
    },
  },
})
export class CustomLog extends CustomDto {
  @prop({ unique: true }) // 设置唯一索引
  id: number;

  @prop({ default: Date.now, index: true, immutable: true })
  create_at?: Date;

  @prop({ default: Date.now })
  update_at?: Date;
}

export const CustomLogProvider = getProviderByTypegoose(CustomLog);
