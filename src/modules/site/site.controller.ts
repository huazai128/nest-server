import { Controller, UseInterceptors } from '@nestjs/common';
import { Site } from './site.model';
import { SiteService } from './site.service';
import { GrpcMethod } from '@nestjs/microservices';
import { SiteRequest, SiteResponse } from '@app/protos/site';
import { PaginateOptions, PaginateResult } from 'mongoose';
import { PaginateQuery } from '@app/interfaces/paginate.interface';
import { isUndefined, trim } from 'lodash';
import { LoggingInterceptor } from '@app/interceptors/logging.interceptor';
import { PaginationInterceptor } from '@app/interceptors/pagination.intercetpor';

/**
 * Site Controller - 处理站点相关的GRPC请求
 * @Controller('site')
 * @UseInterceptors(new LoggingInterceptor()) 日志拦截器
 */
@Controller('site')
@UseInterceptors(new LoggingInterceptor())
export class SiteController {
  constructor(private readonly siteService: SiteService) {}

  /**
   * 创建新站点
   * @param {SiteRequest} data - 站点数据，不包含id
   * @returns {Promise<Site>} 创建的站点信息
   */
  @GrpcMethod('SiteService', 'saveSite')
  async saveSite(data: Omit<SiteRequest, 'id'>): Promise<Site> {
    return this.siteService.createSite(data);
  }

  /**
   * 获取站点列表，支持分页、排序和关键词搜索
   * @param {Object} query - 查询参数
   * @param {number} query.page - 页码
   * @param {number} query.size - 每页数量
   * @param {number} query.sort - 排序方式
   * @param {string} query.kw - 搜索关键词
   * @returns {Promise<PaginateResult<Site>>} 分页后的站点列表
   */
  @GrpcMethod('SiteService', 'getSiteList')
  @UseInterceptors(new PaginationInterceptor())
  async getSiteList(query: any): Promise<PaginateResult<Site>> {
    const { page, size, sort, ...filters } = query;

    // 构建分页查询参数
    const paginateQuery: PaginateQuery<Site> = {};
    const paginateOptions: PaginateOptions = {
      page,
      limit: size,
      select: '-__v', // 排除版本字段
    };

    // 添加排序条件
    if (!isUndefined(sort)) {
      paginateOptions.sort = { _id: sort };
    }

    // 添加关键词搜索条件
    if (filters.kw) {
      const trimmedKeyword = trim(filters.kw);
      const keywordRegExp = new RegExp(trimmedKeyword, 'i');
      paginateQuery.$or = [{ name: keywordRegExp }];
    }

    return this.siteService.paginate(paginateQuery, paginateOptions);
  }

  /**
   * 更新站点信息
   * @param {SiteRequest} request - 包含id和更新数据的请求
   * @returns {Promise<Site>} 更新后的站点信息
   */
  @GrpcMethod('SiteService', 'updateSite')
  async updateSite({ id, ...data }: SiteRequest): Promise<Site> {
    return this.siteService.update(id, data);
  }

  /**
   * 删除指定站点
   * @param {SiteResponse} response - 包含要删除站点id的响应
   * @returns {Promise<any>} 删除操作结果
   */
  @GrpcMethod('SiteService', 'deleteSiteId')
  async deleteSiteId({ id }: SiteResponse): Promise<any> {
    return this.siteService.deleteId(id);
  }

  /**
   * 根据站点ID获取站点详细信息
   * @param {Object} param - 包含站点id的参数对象
   * @param {number} param.id - 站点ID
   * @returns {Promise<Site>} 站点详细信息
   */
  @GrpcMethod('SiteService', 'getByIdSiteInfo')
  async getByIdSiteInfo(param: { id: number }): Promise<Site> {
    return this.siteService.getByIdSiteInfo(param.id);
  }
}
