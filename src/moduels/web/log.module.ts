import { Module } from '@nestjs/common';
import { LogController } from './log.controller';
import { LogService } from './log.service';
import { LogProvider } from './log.model';
import { SiteProvider } from '../site/site.model';

@Module({
  imports: [],
  controllers: [LogController],
  providers: [LogProvider, SiteProvider, LogService],
})
export class LogModule {}
