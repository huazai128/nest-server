import { Module } from '@nestjs/common';
import { ApiController } from './api.controller';
import { ApiLogProvider } from './api.model';
import { ApiLogService } from './api.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [ApiController],
  providers: [ApiLogProvider, ApiLogService],
  exports: [ApiLogService],
})
export class ApiLogModule {}
