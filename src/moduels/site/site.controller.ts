import { Controller, UseInterceptors } from '@nestjs/common';
import { Site } from './site.model';
import { SiteService } from './site.service';
import { GrpcMethod } from '@nestjs/microservices';
import { SiteRequest } from '@app/protos/site';
import { PaginateOptions, PaginateResult } from 'mongoose';
import { PaginateQuery } from '@app/interfaces/paginate.interface';
import { isUndefined, trim } from 'lodash';
import { LoggingInterceptor } from '@app/interceptors/logging.interceptor';
import { PaginationInterceptor } from '@app/interceptors/pagination.intercetpor';

@Controller('site')
@UseInterceptors(new LoggingInterceptor())
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
   * 分页获取site 数据
   * @param {*} query
   * @return {*}  {Promise<PaginateResult<Site>>}
   * @memberof SiteController
   */
  @GrpcMethod('SiteService', 'getSiteList')
  @UseInterceptors(new PaginationInterceptor())
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
    paginateOptions.select = '-__v -_id';
    const result = await this.siteService.paginate(
      paginateQuery,
      paginateOptions,
    );
    return result;
  }

  /**
   * 根据id 更新
   * @param {SiteRequest} { id, ...data }
   * @return {*}
   * @memberof SiteController
   */
  @GrpcMethod('SiteService', 'updateSite')
  updateSite({ id, ...data }: SiteRequest) {
    return this.siteService.updateSite(id, data);
  }
}
