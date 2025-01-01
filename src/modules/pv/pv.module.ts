import { Module } from '@nestjs/common';
import { PvLogController } from './pv.controller';
import { PvLogProvider } from './pv.model';
import { PvLogService } from './pv.service';

@Module({
  imports: [],
  controllers: [PvLogController],
  providers: [PvLogProvider, PvLogService],
  exports: [PvLogService],
})
export class PvLogModule {}
