import { AuthModule } from './auth/auth.module';
import { SiteModule } from './site/site.module';
import { ProtousersModule } from './userproto/userproto.module';
import { LogModule } from './log/log.module';

export default [AuthModule, ProtousersModule, SiteModule, LogModule];
