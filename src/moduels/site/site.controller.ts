import {
  Body,
  Controller,
  Post,
  Get,
  UseGuards,
  Query,
  Delete,
  Put,
} from '@nestjs/common';
import { Site } from './site.model';
import { SiteService } from './site.service';
import { SitePaginateDTO } from './site.dto';
import { PaginateOptions, PaginateResult } from 'mongoose';
import lodash from 'lodash';

@Controller('/api/site')
export class SiteController {
  constructor(private readonly siteService: SiteService) {}

  /**
   * 创建站点
   * @param {Site} data
   * @return {*}  {Promise<Site>}
   * @memberof SiteController
   */
  @Post()
  createSite(@Body() data: Site): Promise<Site> {
    return this.siteService.createSite(data);
  }

  /**
   * 获取所有站点
   * @param {SitePaginateDTO} query
   * @return {*}
   * @memberof SiteController
   */
  @Get()
  getSites(@Query() query: SitePaginateDTO): Promise<PaginateResult<Site>> {
    const { page, size, sort, ...filters } = query;
    const paginateQuery: PaginateQuery<Site> = {};
    const paginateOptions: PaginateOptions = { page, limit: size };
    if (!lodash.isUndefined(sort)) {
      paginateOptions.sort = { _id: sort };
    }
    if (!!filters.kw) {
      const trimmed = lodash.trim(filters.kw);
      const keywordRegExp = new RegExp(trimmed, 'i');
      paginateQuery.$or = [{ name: keywordRegExp }];
    }
    paginateOptions.select = '-__v';
    return this.siteService.paginate(paginateQuery, paginateOptions);
  }

  /**
   * 根据ID获取站点详情
   * @param {SitePaginateDTO} query
   * @return {*}
   * @memberof SiteController
   */
  @Get(':id')
  getSiteById(
    @QueryParams() { params }: QueryParamsResult,
  ): Promise<Site | null> {
    const { id } = params;
    return this.siteService.getSiteInfo(id);
  }

  /**
   * 根据ID删除
   * @param {QueryParamsResult} { params }
   * @return {*}
   * @memberof SiteController
   */
  @Delete(':id')
  @UseGuards(ApiGuard)
  @Responsor.api()
  @Responsor.handle('删除站点')
  deleteSiteId(@QueryParams() { params }: QueryParamsResult) {
    return this.siteService.deleteId(params.id);
  }

  /**
   * 更新站点
   * @param {QueryParamsResult} { params }
   * @param {Site} site
   * @return {*}
   * @memberof SiteController
   */
  @Put(':id')
  @UseGuards(ApiGuard)
  @Responsor.api()
  @Responsor.handle('更新站点')
  putSite(@QueryParams() { params }: QueryParamsResult, @Body() site: Site) {
    return this.siteService.update(params.id, site);
  }
}
