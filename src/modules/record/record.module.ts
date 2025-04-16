import { Module } from '@nestjs/common';
import { RecordService } from './record.service';
import { RecordController } from './record.controller';
import { RecordProvider } from './record.model';

@Module({
  controllers: [RecordController],
  providers: [RecordService, RecordProvider],
  exports: [RecordService],
})
export class RecordModule {}
