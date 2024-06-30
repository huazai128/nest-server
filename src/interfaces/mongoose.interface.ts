import type {
  AggregatePaginateModel,
  Model,
  PaginateModel,
  Types,
} from 'mongoose';
import type { DocumentType } from '@typegoose/typegoose';

export type MongooseDoc<T> = Omit<DocumentType<T>, '_id' | 'id'> &
  T & { _id: Types.ObjectId };
export type MongooseModel<T> = Model<MongooseDoc<T>> &
  PaginateModel<MongooseDoc<T>> &
  AggregatePaginateModel<MongooseDoc<T>>;

export type MongooseID = Types.ObjectId | string;
