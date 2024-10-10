import { Controller } from '@nestjs/common';
import { Site } from './site.model';
import { SiteService } from './site.service';
import { GrpcMethod } from '@nestjs/microservices';
import { SiteRequest } from '@app/protos/site';
import { PaginateOptions, PaginateResult } from 'mongoose';
import { PaginateQuery } from '@app/interfaces/paginate.interface';
import { isUndefined, trim } from 'lodash';

@Controller('site')
export class SiteController {
  constructor(private readonly siteService: SiteService) {}

  /**
   * 新增
   * @param {SiteRequest} data
   * @return {*}  {Promise<Site>}
   * @memberof SiteController
   */
  @GrpcMethod('SiteService', 'saveSite')
  async saveSite(data: SiteRequest): Promise<Site> {
    return this.siteService.createSite(data);
  }

  /**
   *
   * @param {*} query
   * @return {*}  {Promise<PaginateResult<Site>>}
   * @memberof SiteController
   */
  @GrpcMethod('SiteService', 'getSiteList')
  async getSiteList(query: any): Promise<PaginateResult<Site>> {
    const { page, size, sort, ...filters } = query;
    const paginateQuery: PaginateQuery<Site> = {};
    const paginateOptions: PaginateOptions = { page, limit: size };
    if (!isUndefined(sort)) {
      paginateOptions.sort = { _id: sort };
    }
    if (!!filters.kw) {
      const trimmed = trim(filters.kw);
      const keywordRegExp = new RegExp(trimmed, 'i');
      paginateQuery.$or = [{ name: keywordRegExp }];
    }
    paginateOptions.select = '-__v';
    return this.siteService.paginate(paginateQuery, paginateOptions);
  }
}
