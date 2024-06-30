import { getProviderByTypegoose } from '@app/transformers/model.transform';
import { AutoIncrementID } from '@typegoose/auto-increment';
import { modelOptions, plugin, prop } from '@typegoose/typegoose';
import {
  IsDefined,
  IsNumberString,
  IsOptional,
  IsString,
  IsNumber,
} from 'class-validator';
import * as paginate from 'mongoose-paginate-v2';

@plugin(AutoIncrementID, {
  field: 'userId',
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
export class User {

  @prop({ unique: true }) // 设置唯一索引
  userId: number;

  @IsString({ message: "what's your account?" })
  @IsDefined()
  @prop({ required: true })
  account: string;

  @IsString()
  @IsOptional()
  @prop({ default: '' })
  avatar: string;

  @IsString()
  @prop({ type: String, select: false })
  password: string;

  @IsNumber()
  @IsNumberString()
  @IsOptional()
  @prop({ type: Number, default: 0 })
  role: number;

  @prop({ default: Date.now, index: true, immutable: true })
  create_at?: Date;

  @prop({ default: Date.now })
  update_at?: Date;
}

export const UserProvider = getProviderByTypegoose(User);
