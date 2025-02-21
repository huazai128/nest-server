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
import { Cron } from '@nestjs/schedule';

/**
 * 站点服务类 - 处理站点相关的业务逻辑
 */
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

  /**
   * 获取站点缓存键值
   * @param id 站点ID
   * @returns 缓存键值
   */
  private getCacheKey = (id: string): string => {
    return getSiteCacheKey(id);
  };

  /**
   * 删除站点相关的所有日志记录
   * @param siteId 站点ID
   */
  private async deleteSiteLog(siteId: MongooseID): Promise<void> {
    // 将待删除的站点ID添加到Redis中等待定时任务处理
    await this.cacheService.set(
      `delete_site_logs:${siteId.toString()}`,
      siteId.toString(),
    );
  }

  /**
   * 定时任务：每天0点执行删除站点日志，防止白天删除时，访问量大导致日志删除失败
   */
  @Cron('0 0 0 * * *')
  private async handleDeleteSiteLogs() {
    const keys = await this.cacheService.keys('delete_site_logs:*');
    for (const key of keys) {
      const siteId = await this.cacheService.get<string>(key);
      if (siteId) {
        await Promise.all([
          this.webLogService.siteIdRemove(siteId),
          this.apiLogService.siteIdRemove(siteId),
          this.eventLogService.siteIdRemove(siteId),
          this.errorLogService.siteIdRemove(siteId),
          this.customLogService.siteIdRemove(siteId),
          this.pvLogService.siteIdRemove(siteId),
          this.prefLogService.siteIdRemove(siteId),
          this.userLogService.siteIdRemove(siteId),
        ]);
        await this.cacheService.del(key);
      }
    }
  }

  /**
   * 创建新站点
   * @param site 站点信息(不包含ID)
   * @throws 站点名称已存在时抛出错误
   * @returns 创建的站点文档
   */
  public async createSite(site: Omit<Site, 'id'>): Promise<MongooseDoc<Site>> {
    // 检查站点名称是否已存在
    const existedSite = await this.siteModel
      .findOne({ name: site.name })
      .exec();
    if (existedSite) {
      throw `站点 "${site.name}" 已存在`;
    }

    // 创建新站点并缓存
    const newSite = await this.siteModel.create(site);
    await this.cacheService.set(
      this.getCacheKey(newSite._id.toString()),
      newSite,
    );

    return newSite;
  }

  /**
   * 分页获取站点列表
   * @param paginateQuery 查询条件
   * @param paginateOptions 分页选项
   * @returns 分页后的站点列表
   */
  public paginate(
    paginateQuery: PaginateQuery<Site>,
    paginateOptions: PaginateOptions,
  ): Promise<PaginateResult<Site>> {
    return this.siteModel.paginate(paginateQuery, paginateOptions);
  }

  /**
   * 删除指定站点及其相关数据
   * @param id 站点ID
   * @throws 站点不存在时抛出错误
   * @returns 被删除的站点文档
   */
  public async deleteId(id: MongooseID): Promise<MongooseDoc<Site>> {
    const site = await this.siteModel.findByIdAndDelete(id).exec();
    if (!site) {
      throw `站点 ID:${id} 不存在`;
    }

    // 删除缓存和触发日志删除任务
    this.cacheService.del(this.getCacheKey(id.toString()));
    await this.deleteSiteLog(id);

    return site;
  }

  /**
   * 更新站点信息
   * @param id 站点ID
   * @param data 更新的站点数据
   * @throws 站点不存在时抛出错误
   * @returns 更新后的站点文档
   */
  public async update(
    id: MongooseID,
    data: Omit<Site, 'id'>,
  ): Promise<MongooseDoc<Site>> {
    const site = await this.siteModel
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
    if (!site) {
      throw `站点 ID:${id} 不存在，更新失败`;
    }

    // 更新缓存
    await this.cacheService.set(this.getCacheKey(id.toString()), site);
    return site;
  }

  /**
   * 获取站点信息(优先从缓存获取)
   * @param id 站点ID
   * @returns 站点信息或null
   */
  public async getSiteInfo(id?: string): Promise<Site | null> {
    if (!id) return null;

    // 尝试从缓存获取
    const cacheKey = this.getCacheKey(id);
    const siteInfoCache = await this.cacheService.get<Site>(cacheKey);
    if (siteInfoCache) {
      return siteInfoCache;
    }

    // 缓存未命中，从数据库获取并设置缓存
    const siteInfo = await this.siteModel.findById(id).exec();
    if (siteInfo) {
      await this.cacheService.set(cacheKey, siteInfo);
    }
    return siteInfo;
  }

  /**
   * 根据自增ID获取站点信息
   * @param id 自增ID
   * @returns 站点信息
   */
  public async getByIdSiteInfo(id: number): Promise<Site | null> {
    return this.siteModel.findOne({ id }).exec();
  }
}
