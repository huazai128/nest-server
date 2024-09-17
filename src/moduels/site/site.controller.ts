import { Body, Controller, Get, Delete, Put } from '@nestjs/common';
import { Site } from './site.model';
import { SiteService } from './site.service';
import { GrpcMethod } from '@nestjs/microservices';

@Controller()
export class SiteController {
  constructor(private readonly siteService: SiteService) {}

  @GrpcMethod('SiteService', 'createSite')
  createSite(@Body() data: Site): Promise<Site> {
    return this.siteService.createSite(data);
  }

  @Get()
  getSites() {}

  @Get(':id')
  getSiteById() {}

  @Delete(':id')
  deleteSiteId() {}

  @Put(':id')
  putSite() {
    return;
  }
}
