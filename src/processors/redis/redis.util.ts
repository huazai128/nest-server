import {
  REDIS_MODULE_CONNECTION,
  REDIS_MODULE_CONNECTION_TOKEN,
  REDIS_MODULE_OPTIONS_TOKEN,
} from '@app/constants/redis.constant';
import { RedisModuleOptions } from '@app/interfaces/redis.interface';
import logger from '@app/utils/logger';
import { Redis, RedisOptions } from 'ioredis';

// 生成Inject注入的token, 用于获取redis 配置信息
export function getRedisOptionsToken(): string {
  return `${REDIS_MODULE_CONNECTION}_${REDIS_MODULE_OPTIONS_TOKEN}`;
}

// 生成Inject注入的token, 用于获取redis 实例
export function getRedisConnectionToken(): string {
  return `${REDIS_MODULE_CONNECTION}_${REDIS_MODULE_CONNECTION_TOKEN}`;
}

// redis重试次数
export function retryStrategy(retries: number): number | null {
  const errorMessage = [
    '[Redis]',
    `retryStrategy！retries: ${JSON.stringify(retries)}`,
  ];
  logger.error(...(errorMessage as [any]));
  // 这里可以加上告警
  if (retries > 8) {
    new Error('[Redis] 尝试次数已达极限！');
    return null;
  }
  return Math.min(retries * 1000, 3000);
}

// 创建redis连接
export function createRedisConnection(options: RedisModuleOptions) {
  const { type, options: commonOptions = {} } = options;
  switch (type) {
    // 单例或者哨兵模式
    case 'single':
      const { url, options: { port, host } = {} } = options;
      const connectionOptions: RedisOptions = {
        retryStrategy: retryStrategy,
        ...commonOptions,
        port,
        host,
      };
      return url
        ? new Redis(url, connectionOptions)
        : new Redis(connectionOptions);
    case 'cluster': // 集群
      return new Redis.Cluster(options.nodes, commonOptions);
    default:
      throw new Error('无效配置，请查看配置文档');
  }
}
