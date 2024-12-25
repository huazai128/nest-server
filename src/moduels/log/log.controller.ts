import { LoggingInterceptor } from '@app/interceptors/logging.interceptor';
import { Controller, UseInterceptors } from '@nestjs/common';
import { LogService } from './log.service';
import { GrpcMethod } from '@nestjs/microservices';
import { LogRequest, LogResponse } from '@app/protos/log';

@Controller('log')
@UseInterceptors(new LoggingInterceptor())
export class LogController {
  constructor(private readonly logService: LogService) {}

  @GrpcMethod('LogService', 'saveLog')
  async saveLog(data: LogRequest): Promise<LogResponse> {
    console.log(data, 'data');
    return this.logService.create(data);
  }
}
