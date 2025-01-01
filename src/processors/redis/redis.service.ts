import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { createLogger } from '@app/utils/logger';
import { isDevEnv } from '@app/app.env';
import { isNil, UNDEFINED } from '@app/constants/value.constant';
import { RedisModuleOptions } from '@app/interfaces/redis.interface';
import {
  InjectRedis,
  InjectRedisOptions,
} from '@app/decorators/redis.decorator';

const logger = createLogger({ scope: 'RedisService', time: isDevEnv });

@Injectable()
export class RedisService {
  public client: Redis;
  constructor(
    @InjectRedis() private readonly redis: Redis,
    @InjectRedisOptions() private readonly redisOptions: RedisModuleOptions,
  ) {
    this.client = this.redis;
    // 监听redis相关方法
    this.redis.on('connect', () => {
      logger.info('[Redis]', 'connecting...');
    });
    this.redis.on('reconnecting', () => {
      logger.warn('[Redis]', 'reconnecting...');
    });
    this.redis.on('ready', () => {
      logger.info('[Redis]', 'readied!');
    });
    this.redis.on('end', () => {
      logger.error('[Redis]', 'Client End!');
    });
    this.redis.on('error', (error) => {
      logger.error('[Redis]', `Client Error!`, error.message);
    });
  }

  /**
   * 解析参数
   * @private
   * @template T
   * @param {(string | null | void)} value
   * @return {*}
   * @memberof RedisService
   */
  private parseValue<T>(value: string | null | void) {
    return isNil(value) ? UNDEFINED : (JSON.parse(value) as T);
  }

  /**
   * value 转成 string
   * @private
   * @param {unknown} value
   * @return {*}  {string}
   * @memberof RedisService
   */
  private stringifyValue(value: unknown): string {
    return isNil(value) ? '' : JSON.stringify(value);
  }

  /**
   * redis 设置值
   * @param {string} key
   * @param {*} value
   * @param {number} [ttl]
   * @return {*}  {Promise<void>}
   * @memberof RedisService
   */
  public async set(key: string, value: any, ttl?: number): Promise<void> {
    const _value = this.stringifyValue(value);
    if (!isNil(ttl) && ttl !== 0) {
      await this.redis.set(key, _value, 'EX', ttl);
    } else {
      await this.redis.set(key, _value);
    }
  }

  /**
   * redis 获取值
   * @template T
   * @param {string} key
   * @return {*}  {(Promise<T | undefined>)}
   * @memberof RedisService
   */
  public async get<T>(key: string): Promise<T | undefined> {
    const value = await this.redis.get(key);
    return this.parseValue<T>(value);
  }

  /**
   * mset事务添加或者批量添加
   * @param {[string, any][]} kvList
   * @param {number} [ttl]
   * @return {*}  {Promise<void>}
   * @memberof RedisService
   */
  public async mset(kvList: [string, any][], ttl?: number): Promise<void> {
    if (!isNil(ttl) && ttl !== 0) {
      const multi = this.redis.multi();
      for (const [key, value] of kvList) {
        multi.set(key, this.stringifyValue(value), 'EX', ttl);
      }
      await multi.exec();
    } else {
      // 批量添加
      await this.redis.mset(
        kvList.map(([key, value]) => {
          return [key, this.stringifyValue(value)] as [string, string];
        }),
      );
    }
  }

  /**
   * 批量获取
   * @param {...string[]} keys
   * @return {*}  {Promise<any[]>}
   * @memberof RedisService
   */
  public mget(...keys: string[]): Promise<any[]> {
    return this.redis.mget(keys).then((values) => {
      return values.map((value) => this.parseValue<unknown>(value));
    });
  }

  /**
   * 批量删除
   * @param {...string[]} keys
   * @memberof RedisService
   */
  public async mdel(...keys: string[]) {
    await this.redis.del(keys);
  }

  /**
   * 单个删除
   * @param {string} key
   * @return {*}  {Promise<boolean>}
   * @memberof RedisService
   */
  public async del(key: string): Promise<boolean> {
    const deleted = await this.redis.del(key);
    return deleted > 0;
  }

  /**
   * 查询集合中是否有指定的key
   * @param {string} key
   * @return {*}  {Promise<boolean>}
   * @memberof RedisService
   */
  public async has(key: string): Promise<boolean> {
    const count = await this.redis.exists(key);
    return count !== 0;
  }

  /**
   * 以秒为单位，返回给定 key 的剩余生存时间
   * @param {string} key
   * @return {*}  {Promise<number>}
   * @memberof RedisService
   */
  public async ttl(key: string): Promise<number> {
    return await this.redis.ttl(key);
  }

  /**
   * 获取所有key
   * @param {string} [pattern='*']
   * @return {*}  {Promise<string[]>}
   * @memberof RedisService
   */
  public async keys(pattern = '*'): Promise<string[]> {
    return await this.redis.keys(pattern);
  }

  /**
   * 清除所有
   * @param {string} key
   * @memberof RedisService
   */
  public async clean(key: string) {
    await this.redis.del(await this.keys());
  }
}
