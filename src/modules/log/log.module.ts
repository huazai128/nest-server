import { Module } from '@nestjs/common';
import { LogController } from './log.controller';
import { LogKafkaController } from './log.kafka.controller';
import { LogService } from './log.service';
import { LogIngestBatchService } from './log-ingest-batch.service';
import { LogProvider } from './log.model';
import { SiteProvider } from '../site/site.model';
import { ScheduleModule } from '@nestjs/schedule';
import { ApiLogModule } from '../api/api.module';
import { EventLogModule } from '../eventLog/eventLog.module';
import { CustomLogModule } from '../customLog/customLog.module';
import { ErrorLogModule } from '../error/error.module';
import { PvLogModule } from '../pv/pv.module';
import { PrefModule } from '../perf/pref.module';
import { UserLogModule } from '../user/user.module';
import { RecordModule } from '../record/record.module';
import { NetworkSpeedLogModule } from '../networkSpeedLog/networkSpeedLog.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ApiLogModule,
    EventLogModule,
    CustomLogModule,
    ErrorLogModule,
    PvLogModule,
    PrefModule,
    UserLogModule,
    RecordModule,
    NetworkSpeedLogModule,
  ],
  controllers: [LogController, LogKafkaController],
  providers: [LogProvider, SiteProvider, LogService, LogIngestBatchService],
  exports: [LogService],
})
export class LogModule {}
