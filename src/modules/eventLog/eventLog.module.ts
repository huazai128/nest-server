import { Module } from '@nestjs/common'
import { EventLogController } from './eventLog.controller'
import { EventLogProvider } from './eventLog.model'
import { EventLogService } from './eventLog.service'

@Module({
  imports: [],
  controllers: [EventLogController],
  providers: [EventLogProvider, EventLogService],
  exports: [EventLogService],
})
export class EventLogModule {}
