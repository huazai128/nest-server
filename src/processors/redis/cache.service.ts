import { Injectable } from '@nestjs/common'
import { RedisService } from './redis.service'

export type CacheKey = string
export type CacheResult<T> = Promise<T>

export interface CachePromiseOption<T> {
  key: CacheKey
  promise(): CacheResult<T>
}

export interface CacheIOResult<T> {
  get(): CacheResult<T>
  update(): CacheResult<T>
}

export interface CachePromiseIOOption<T> extends CachePromiseOption<T> {
  ioMode?: boolean
}

@Injectable()
export class CacheService {
  constructor(private readonly redisService: RedisService) {}

  /**
   * 设置缓存
   * @param {string} key
   * @param {string} value
   * @param {number} [ttl]
   * @return {*}
   * @memberof CacheService
   */
  public set(key: string, value: string, ttl?: number): Promise<void> {
    return this.redisService.set(key, value, ttl)
  }

  /**
   * 获取缓存
   * @template T
   * @param {string} key
   * @return {*}  {Promise<T>}
   * @memberof CacheService
   */
  public get<T>(key: string): Promise<T> {
    return this.redisService.get(key) as Promise<T>
  }

  /**
   * 删除缓存
   * @param {string} key
   * @return {*}  {Promise<Boolean>}
   * @memberof CacheService
   */
  public delete(key: string): Promise<Boolean> {
    return this.redisService.del(key)
  }

  /**
   *
   * @template T
   * @param {CachePromiseOption<T>} options
   * @return {*}  {CacheResult<T>}
   * @memberof CacheService
   * @example CacheService.promise({ key: CacheKey, promise() }) -> promise()
   * @example CacheService.promise({ key: CacheKey, promise(), ioMode: true }) -> { get: promise(), update: promise() }
   */
  promise<T>(options: CachePromiseOption<T>): CacheResult<T>
  promise<T>(options: CachePromiseIOOption<T>): CacheIOResult<T>
  promise(options) {
    const { key, promise, ioMode = false } = options

    const doPromiseTask = async () => {
      const data = await promise()
      await this.set(key, data)
      return data
    }

    // passive mode
    const handlePromiseMode = async () => {
      const value = await this.get(key)
      return value !== null && value !== undefined ? value : await doPromiseTask()
    }

    // sync mode
    const handleIoMode = () => ({
      get: handlePromiseMode,
      update: doPromiseTask,
    })

    return ioMode ? handleIoMode() : handlePromiseMode()
  }
}
