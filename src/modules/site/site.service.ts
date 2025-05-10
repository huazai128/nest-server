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
import { MeasureAsyncTime } from '@app/decorators/async.decorator';

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
  @MeasureAsyncTime()
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
  @MeasureAsyncTime()
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
  @MeasureAsyncTime()
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
   */
  @MeasureAsyncTime()
  public async paginate(
    paginateQuery: PaginateQuery<Site>,
    paginateOptions: PaginateOptions,
  ): Promise<PaginateResult<Site>> {
    // 添加默认投影，只返回必要字段
    const defaultProjection = {
      id: 1,
      name: 1,
      state: 1,
      isApi: 1,
      reportUrl: 1,
      feedbackUrl: 1,
      create_at: 1,
      update_at: 1,
      _id: 0, // 不返回 _id
    };

    // 合并投影
    paginateOptions.select = {
      ...defaultProjection,
      ...((paginateOptions.select as Record<string, number>) || {}),
    };

    // 添加默认排序
    if (!paginateOptions.sort) {
      paginateOptions.sort = { create_at: -1 };
    }

    return this.siteModel.paginate(paginateQuery, paginateOptions);
  }

  /**
   * 删除指定站点及其相关数据
   * @param id 站点ID
   * @throws 站点不存在时抛出错误
   * @returns 被删除的站点文档
   */
  @MeasureAsyncTime()
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
  @MeasureAsyncTime()
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
   */
  @MeasureAsyncTime()
  public async getSiteInfo(id?: string): Promise<Site | null> {
    if (!id) return null;

    const cacheKey = this.getCacheKey(id);

    // 使用 pipeline 优化缓存获取
    const cachedSite = await this.cacheService.get<Site>(cacheKey);
    if (cachedSite) {
      return cachedSite;
    }

    // 只查询必要字段
    const siteInfo = await this.siteModel
      .findById(id)
      .select({
        id: 1,
        name: 1,
        state: 1,
        isApi: 1,
        reportUrl: 1,
        feedbackUrl: 1,
        create_at: 1,
        update_at: 1,
        _id: 0,
      })
      .lean() // 使用 lean() 返回普通 JavaScript 对象，提高性能
      .exec();

    if (siteInfo) {
      // 设置缓存，添加过期时间
      await this.cacheService.set(cacheKey, siteInfo, 3600); // 1小时过期
    }

    return siteInfo;
  }

  /**
   * 根据自增ID获取站点信息
   */
  @MeasureAsyncTime()
  public async getByIdSiteInfo(id: number): Promise<Site | null> {
    // 使用 lean() 和 select() 优化查询
    return this.siteModel
      .findOne({ id })
      .select({
        id: 1,
        name: 1,
        state: 1,
        isApi: 1,
        reportUrl: 1,
        feedbackUrl: 1,
        create_at: 1,
        update_at: 1,
        _id: 1,
      })
      .lean()
      .exec();
  }
}
