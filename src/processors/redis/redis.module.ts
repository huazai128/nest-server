import {
  RedisModuleAsyncOptions,
  RedisModuleOptions,
  RedisModuleOptionsFactory,
} from '@app/interfaces/redis.interface'
import { DynamicModule, Global, Module, Provider } from '@nestjs/common'
import { createRedisConnection, getRedisConnectionToken, getRedisOptionsToken } from './redis.util'
import { RedisService } from './redis.service'
import { createLogger } from '@app/utils/logger'
import { isDevEnv } from '@app/app.env'
import { CacheService } from './cache.service'

const logger = createLogger({ scope: 'RedisCoreModule', time: isDevEnv })

@Global()
@Module({
  imports: [],
  providers: [RedisService, CacheService],
  exports: [RedisService, CacheService],
})
export class RedisCoreModule {
  /**
   * 同步
   * @static
   * @param {RedisModuleOptions} options  // redis 配置
   * @return {*}  {DynamicModule}
   * @memberof RedisCoreModule
   */
  static forRoot(options: RedisModuleOptions): DynamicModule {
    // 提供非class类提供器的令牌， 获取redis配置信息  使用useValue值提供器
    const redisOptionsProvider: Provider = {
      provide: getRedisOptionsToken(),
      useValue: options,
    }

    // 提供非class类提供器的令牌，获取redis实例
    const redisConnectionProvider: Provider = {
      provide: getRedisConnectionToken(),
      useValue: createRedisConnection(options),
    }

    return {
      module: RedisCoreModule,
      providers: [redisOptionsProvider, redisConnectionProvider],
      exports: [redisOptionsProvider, redisConnectionProvider],
    }
  }

  /**
   * 异步动态模块
   * @static
   * @param {RedisModuleAsyncOptions} options
   * @return {*}  {DynamicModule}
   * @memberof RedisCoreModule
   */
  static forRootAsync(options: RedisModuleAsyncOptions): DynamicModule {
    // redis 连接工厂
    const redisConnectionProvider: Provider = {
      provide: getRedisConnectionToken(), // 提供非class类的令牌
      useFactory(options: RedisModuleOptions) {
        return createRedisConnection(options)
      },
      inject: [getRedisOptionsToken()], // 向工厂提供注入相关依赖
    }
    return {
      module: RedisCoreModule,
      imports: options.imports,
      providers: [...this.createAsyncProviders(options), redisConnectionProvider],
      exports: [redisConnectionProvider],
    }
  }

  /**
   * 处理不同提供器的返回Provider
   * @static
   * @param {RedisModuleAsyncOptions} options
   * @return {*}  {Provider[]}
   * @memberof RedisCoreModule
   */
  public static createAsyncProviders(options: RedisModuleAsyncOptions): Provider[] {
    // 提供器只提供useClass、useFactory、useExisting这三种自定义提供器
    if (!(options.useExisting || options.useFactory || options.useClass)) {
      throw new Error('无效配置，提供器只提供useClass、useFactory、useExisting这三种自定义提供器')
    }

    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)]
    }

    // 不存在就报错
    if (!options.useClass) {
      throw new Error('无效配置，提供器只提供useClass、useFactory、useExisting这三种自定义提供器')
    }
    return [this.createAsyncOptionsProvider(options), { provide: options.useClass, useClass: options.useClass }]
  }

  /**
   * 使用工厂提供器
   * @static
   * @param {RedisModuleAsyncOptions} options
   * @return {*}  {Provider}
   * @memberof RedisCoreModule
   */
  public static createAsyncOptionsProvider(options: RedisModuleAsyncOptions): Provider {
    // 提供器只提供useClass、useFactory、useExisting这三种自定义提供器
    if (!(options.useExisting || options.useFactory || options.useClass)) {
      throw new Error('无效配置，提供器只提供useClass、useFactory、useExisting这三种自定义提供器')
    }

    //  使用工厂提供器
    if (options.useFactory) {
      return {
        provide: getRedisOptionsToken(), // 使用非类提供器令牌
        useFactory: options.useFactory,
        inject: options.inject || [], // 注入器，
      }
    }

    return {
      provide: getRedisOptionsToken(), // 使用非类提供器令牌， 通过Inject()  string 类型的值，
      // 工厂提供器，是用过inject  注入options.useClass、options.useExisting 执行createRedisModuleOptions方法返回redis 实例
      async useFactory(optionsFactory: RedisModuleOptionsFactory): Promise<RedisModuleOptions> {
        return await optionsFactory.createRedisModuleOptions()
      },
      inject: [options.useClass || options.useExisting] as never,
    }
  }
}
