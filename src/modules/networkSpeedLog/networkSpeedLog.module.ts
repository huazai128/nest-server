import { Module } from '@nestjs/common';
import { NetworkSpeedLogController } from './networkSpeedLog.controller';
import { NetworkSpeedLogProvider } from './networkSpeedLog.model';
import { NetworkSpeedLogService } from './networkSpeedLog.service';

@Module({
  controllers: [NetworkSpeedLogController],
  providers: [NetworkSpeedLogProvider, NetworkSpeedLogService],
  exports: [NetworkSpeedLogService],
})
export class NetworkSpeedLogModule {}
