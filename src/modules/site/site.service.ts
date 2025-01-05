import {
  MongooseDoc,
  MongooseID,
  MongooseModel,
} from '@app/interfaces/mongoose.interface';
import { PaginateQuery } from '@app/interfaces/paginate.interface';
import { InjectModel } from '@app/transformers/model.transform';
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { PaginateOptions, PaginateResult } from 'mongoose';
import { Site } from './site.model';
import { ApiLogService } from '../api/api.service';
import { CustomLogService } from '../customLog/customLog.service';
import { ErrorLogService } from '../error/error.service';
import { EventLogService } from '../eventLog/eventLog.service';
import { PrefService } from '../perf/pref.service';
import { PvLogService } from '../pv/pv.service';
import { LogService } from '../log/log.service';
import { getSiteCacheKey } from '@app/constants/cache.contant';
import { UserLogService } from '../user/user.service';
import { RedisService } from '@app/processors/redis/redis.service';

@Injectable()
export class SiteService {
  constructor(
    @InjectModel(Site) private readonly siteModel: MongooseModel<Site>,
    @Inject(forwardRef(() => ErrorLogService))
    private readonly errorLogService: ErrorLogService,
    private readonly apiLogService: ApiLogService,
    private readonly eventLogService: EventLogService,
    private readonly customLogService: CustomLogService,
    private readonly pvLogService: PvLogService,
    private readonly prefLogService: PrefService,
    private readonly webLogService: LogService,
    private readonly cacheService: RedisService,
    private readonly userLogService: UserLogService,
  ) {}

  private getCacheKey = (id: string) => {
    return getSiteCacheKey(id);
  };

  /**
   * 站点关联的日志删除
   * @private
   * @param {MongooseID} siteId
   * @memberof SiteService
   */
  private deleteSiteLog(siteId: MongooseID) {
    this.webLogService.siteIdRemove(siteId);
    this.apiLogService.siteIdRemove(siteId);
    this.eventLogService.siteIdRemove(siteId);
    this.errorLogService.siteIdRemove(siteId);
    this.customLogService.siteIdRemove(siteId);
    this.pvLogService.siteIdRemove(siteId);
    this.prefLogService.siteIdRemove(siteId);
    this.userLogService.siteIdRemove(siteId);
  }
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
    console.log(site, '=======');
    const res = await this.siteModel.create({
      ...site,
    });
    this.cacheService.set(this.getCacheKey(res._id.toString()), res);
    return res;
  }

  /**
   *  获取所有的数据
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
    const site = await this.siteModel.findByIdAndDelete(id).exec();
    if (!site) {
      throw `站点${id}没有找到`;
    }
    // 删除缓存
    this.cacheService.del(this.getCacheKey(id.toString()));
    this.deleteSiteLog(id);
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
    // 更新缓存
    this.cacheService.set(this.getCacheKey(id.toString()), site);
    // 更新缓存
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
    const siteInfoCache = await this.cacheService.get<Site>(
      getSiteCacheKey(id),
    );
    if (siteInfoCache) {
      return siteInfoCache;
    } else {
      const siteInfo = await this.siteModel.findById(id).exec();
      if (siteInfo) {
        await this.cacheService.set(getSiteCacheKey(id), siteInfo);
      }
      return siteInfo;
    }
  }

  /**
   * 根据自增id获取数据
   * @param {number} id
   * @return {*}  {Promise<Site>}
   * @memberof SiteService
   */
  public async getByIdSiteInfo(id: number): Promise<Site> {
    return this.siteModel.findOne({ id: id }).exec();
  }
}
