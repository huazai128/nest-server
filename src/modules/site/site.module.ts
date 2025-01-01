import { forwardRef, Module } from '@nestjs/common';
import { SiteController } from './site.controller';
import { SiteProvider } from './site.model';
import { SiteService } from './site.service';
import { ApiLogModule } from '../api/api.module';
import { EventLogModule } from '../eventLog/eventLog.module';
import { CustomLogModule } from '../customLog/customLog.module';
import { PvLogModule } from '../pv/pv.module';
import { PrefModule } from '../perf/pref.module';
import { LogModule } from '../log/log.module';
import { UserLogModule } from '../user/user.module';
import { ErrorLogModule } from '../error/error.module';

@Module({
  imports: [
    ApiLogModule,
    EventLogModule,
    CustomLogModule,
    PvLogModule,
    PrefModule,
    LogModule,
    UserLogModule,
    forwardRef(() => ErrorLogModule),
  ],
  controllers: [SiteController],
  providers: [SiteProvider, SiteService],
  exports: [SiteService],
})
export class SiteModule {}
