import { getProviderByTypegoose } from '@app/transformers/model.transform';
import { indexOptions, indexWeights, Report } from '@app/utils/report';
import { HttpStatus } from '@nestjs/common';
import { AutoIncrementID } from '@typegoose/auto-increment';
import { index, modelOptions, prop, plugin } from '@typegoose/typegoose';
import { Method } from 'axios';
import { IsInt, IsOptional, IsString, IsUrl } from 'class-validator';
import * as paginate from 'mongoose-paginate-v2';
import * as aggregatePaginate from 'mongoose-aggregate-paginate-v2';

export class Response {
  @prop({ type: String, default: null })
  message: string | null;

  @IsString()
  @prop({ type: String, default: null, text: true })
  result?: string | null;

  @prop({ type: String, default: null })
  status: string | null;
}

class ApiLogDTO extends Report {
  @IsString()
  @prop({ type: String, index: true, default: null })
  method: Method | null;

  @IsString()
  @IsUrl()
  @IsOptional()
  @prop({ type: String, default: null, index: true, text: true })
  url: string | null;

  @IsString()
  @prop({ type: Object, default: null })
  body: object | null;

  @IsInt()
  @prop({ type: Number, default: 0 })
  requestTime: number;

  @IsInt()
  @prop({ type: Number, default: 0 })
  responseTime: number;

  @IsInt()
  @prop({ type: Number, default: HttpStatus.ACCEPTED })
  status: number;

  @IsString()
  @prop({ type: String, default: null })
  statusText: string | null;

  @prop({ type: () => Response, _id: false, default: null })
  response: Response | null;

  @IsString()
  @prop({ type: Object, default: null })
  params: object | null;

  @IsString()
  @prop({ type: String, default: null })
  traceId: string | null;

  @IsString()
  @prop({ type: String, default: null })
  monitorId: string | null; // 用于记录用户行为，用于错误排查

  @IsString()
  @prop({ type: String, default: null })
  queryUrl: string | null;
}

@index(
  { ...indexOptions, params: 'text', url: 'text' },
  {
    name: 'SearchIndex',
    weights: {
      ...indexWeights,
      params: 20,
      url: 6,
      traceId: 10,
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
    toJSON: { virtuals: true },
    timestamps: {
      createdAt: 'create_at',
      updatedAt: 'update_at',
    },
  },
})
export class ApiLog extends ApiLogDTO {
  @prop({ unique: true })
  id: number;

  @prop({ default: Date.now, index: true, immutable: true })
  create_at?: Date;

  @prop({ default: Date.now })
  update_at?: Date;
}

export const ApiLogProvider = getProviderByTypegoose(ApiLog);
