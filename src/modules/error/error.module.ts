import { Module, forwardRef } from '@nestjs/common';
import { ErrorLogController } from './error.controller';
import { ErrorLogProvider } from './error.model';
import { ErrorLogService } from './error.service';
import { SiteModule } from '../site/site.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot(), forwardRef(() => SiteModule)],
  controllers: [ErrorLogController],
  providers: [ErrorLogProvider, ErrorLogService],
  exports: [ErrorLogService],
})
export class ErrorLogModule {}
