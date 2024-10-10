import {
  MongooseDoc,
  MongooseID,
  MongooseModel,
} from '@app/interfaces/mongoose.interface';
import { InjectModel } from '@app/transformers/model.transform';
import { Site } from './site.model';
import { Injectable } from '@nestjs/common';
import { PaginateOptions, PaginateResult } from 'mongoose';
import { PaginateQuery } from '@app/interfaces/paginate.interface';

@Injectable()
export class SiteService {
  constructor(
    @InjectModel(Site) private readonly siteModel: MongooseModel<Site>,
  ) {}

  /**
   * 创建站点
   * @param {Site} site
   * @return {*}  {Promise<MongooseDoc<Site>>}
   * @memberof SiteService
   */
  public async createSite(site: Site): Promise<MongooseDoc<Site>> {
    const existedSite = await this.siteModel
      .findOne({ name: site.name })
      .exec();
    if (existedSite) {
      throw `${site.name}站点已存在`;
    }
    const res = await this.siteModel.create({
      ...site,
    });
    return res;
  }

  /**
   * 分页获取数据
   * @param {PaginateQuery<Site>} paginateQuery
   * @param {PaginateOptions} paginateOptions
   * @return {*}  {Promise<PaginateResult<Site>>}
   * @memberof SiteService
   */
  public paginate(
    paginateQuery: PaginateQuery<Site>,
    paginateOptions: PaginateOptions,
  ): Promise<PaginateResult<Site>> {
    return this.siteModel.paginate(paginateQuery, paginateOptions);
  }

  /**
   * 删除站点
   * @param {Object} id
   * @return {*}  {Promise<PaginateResult<string>>}
   * @memberof SiteService
   */
  public async deleteId(id: MongooseID): Promise<MongooseDoc<Site>> {
    const site = await this.siteModel.findOneAndDelete({ id: id }).exec();
    if (!site) {
      throw `站点${id}没有找到`;
    }
    // 缓存删除
    return site;
  }

  /**
   * 更新站点
   * @param {MongooseID} id
   * @param {Site} data
   * @memberof SiteService
   */
  public async update(id: MongooseID, data: Site) {
    const site = await this.siteModel
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
    if (!site) {
      throw `更新站点不存在`;
    }
    return site;
  }

  /**
   * 获取sideInfo，优先通过缓存获取，无缓存时读取数据库并设置缓存
   * @param {Site['id']} id
   * @returns {Promise<Site | null>}
   * @memberof SiteService
   */
  public async getSiteInfo(id?: string): Promise<Site | null> {
    if (!id) return null;
  }
}
