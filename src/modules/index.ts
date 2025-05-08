import { AuthModule } from './auth/auth.module';
import { SiteModule } from './site/site.module';
import { ProtousersModule } from './userproto/userproto.module';
import { LogModule } from './log/log.module';
import { EventLogModule } from './eventLog/eventLog.module';
import { PrefModule } from './perf/pref.module';
import { ErrorLogModule } from './error/error.module';
import { PvLogModule } from './pv/pv.module';
import { CustomLogModule } from './customLog/customLog.module';
import { ApiLogModule } from './api/api.module';
import { UserLogModule } from './user/user.module';
import { RecordModule } from './record/record.module';
import { ExpansionModule } from './expansion/expansion.module';

export default [
  AuthModule,
  ProtousersModule,
  SiteModule,
  LogModule,
  EventLogModule,
  PrefModule,
  ErrorLogModule,
  PvLogModule,
  CustomLogModule,
  ApiLogModule,
  UserLogModule,
  RecordModule,
  ExpansionModule,
];
