import { Module } from '@nestjs/common';
import { UserLogProvider } from './user.model';
import { UserLogService } from './user.service';
import { UserLogController } from './user.controller';

@Module({
  imports: [],
  controllers: [UserLogController],
  providers: [UserLogProvider, UserLogService],
  exports: [UserLogService],
})
export class UserLogModule {}
