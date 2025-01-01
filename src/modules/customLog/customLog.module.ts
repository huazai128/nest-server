import { Module } from '@nestjs/common'
import { CustomLogController } from './customLog.controller'
import { CustomLogProvider } from './customLog.model'
import { CustomLogService } from './customLog.service'

@Module({
  imports: [],
  controllers: [CustomLogController],
  providers: [CustomLogProvider, CustomLogService],
  exports: [CustomLogService],
})
export class CustomLogModule {}
