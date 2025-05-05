import { Module } from '@nestjs/common';
import { PrefController } from './pref.controller';
import { PrefLogProvider } from './pref.model';
import { PrefService } from './pref.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [PrefController],
  providers: [PrefLogProvider, PrefService],
  exports: [PrefService],
})
export class PrefModule {}
