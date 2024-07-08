import { Connection as MongodbConnection } from 'mongoose';
import { Inject, Provider } from '@nestjs/common';
import {
  REPOSITORY,
  DB_CONNECTION_TOKEN,
} from '@app/constants/system.constant';
import { getModelForClass } from '@typegoose/typegoose';

export interface TypeClass {
  new (...args: []);
}

// provider名称
export function getModelName(name: string): string {
  return name.toLocaleUpperCase() + REPOSITORY;
}

// mongodb 工厂提供者
export function getProviderByTypegoose(typegooseClass: TypeClass): Provider {
  return {
    provide: getModelName(typegooseClass.name),
    useFactory: (connection: MongodbConnection) => {
      return getModelForClass(typegooseClass, {
        existingConnection: connection,
      });
    },
    inject: [DB_CONNECTION_TOKEN],
  };
}

// Model 注入器
export function InjectModel(model: TypeClass) {
  return Inject(getModelName(model.name));
}
