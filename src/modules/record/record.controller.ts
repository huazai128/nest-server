import { Controller } from '@nestjs/common';
import { RecordService } from './record.service';
import { Record } from './record.model';
import { GrpcMethod } from '@nestjs/microservices';

@Controller('records')
export class RecordController {
  constructor(private readonly recordService: RecordService) {}

  @GrpcMethod('RecordService', 'create')
  create(record: Record): Promise<Record> {
    return this.recordService.create(record);
  }

  @GrpcMethod('RecordService', 'findByMonitorIds')
  findByMonitorIds(monitorIds: string[]): Promise<Record[]> {
    return this.recordService.findByMonitorIds(monitorIds);
  }
}
