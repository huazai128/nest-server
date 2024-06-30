import { Module } from '@nestjs/common';
import { ProtousersController } from './userproto.controller';

@Module({
  controllers: [ProtousersController],
})
export class ProtousersModule {}
