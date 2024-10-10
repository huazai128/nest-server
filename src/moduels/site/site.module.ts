import { Module } from '@nestjs/common';
import { SiteController } from './site.controller';
import { SiteProvider } from './site.model';
import { SiteService } from './site.service';

@Module({
  imports: [],
  controllers: [SiteController],
  providers: [SiteProvider, SiteService],
  exports: [],
})
export class SiteModule {}
