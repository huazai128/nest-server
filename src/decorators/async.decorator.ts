/**
 * 这是一个用于测量异步方法执行时间的装饰器
 * 主要功能:
 * 1. 记录整个方法的总执行时间
 * 2. 记录方法中每个 await 操作的执行时间和下标位置
 * 3. 统计方法中 await 操作的总数
 * 4. 异常处理并记录执行时间
 *
 * 涉及的知识点:
 * 1. 装饰器模式 - 使用 TypeScript 装饰器语法
 * 2. Proxy 代理模式 - 用于拦截和跟踪异步操作
 * 3. Promise 处理 - 识别和包装 Promise 对象
 * 4. 性能测量 - 使用 Date.now() 计算执行时间
 * 5. 错误处理 - try-catch 处理异常情况
 * 6. 日志记录 - 使用自定义 Logger 记录性能指标
 * 7. 方法重写 - 通过 descriptor.value 重写原始方法
 */

import { createLogger } from '@app/utils/logger';

const Logger = createLogger({ scope: 'AsyncDecorator' });

/**
 * 计算异步操作耗时的装饰器，会记录每个await的耗时和位置
 * @param target 目标类
 * @param methodName 方法名
 * @param descriptor 属性描述符
 */
export function MeasureAsyncTime() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      try {
        // 重写原方法，拦截所有await操作
        let awaitCount = 0;
        const awaitLocations = new Map<number, string>();

        const handler = {
          get: (target: any, prop: string | symbol) => {
            const value = target[prop];
            if (value && typeof value.then === 'function') {
              const stack = new Error().stack;
              const location =
                stack?.split('\n')[2]?.trim() || 'unknown location';
              awaitCount++;
              const currentAwaitCount = awaitCount;
              awaitLocations.set(currentAwaitCount, location);

              const awaitStartTime = Date.now();
              return value.then((result: any) => {
                const awaitEndTime = Date.now();
                const awaitDuration = awaitEndTime - awaitStartTime;
                Logger.info(
                  `Method ${propertyKey} await #${currentAwaitCount} at ${awaitLocations.get(currentAwaitCount)} took ${awaitDuration}ms`,
                );
                return result;
              });
            }
            return value;
          },
        };

        const proxy = new Proxy(this, handler);
        const result = await originalMethod.apply(proxy, args);
        const endTime = Date.now();
        const duration = endTime - startTime;

        Logger.info(
          `Method ${propertyKey} completed in ${duration}ms with ${awaitCount} await operations`,
        );
        return result;
      } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        Logger.error(`Method ${propertyKey} failed after ${duration}ms`, error);
        throw error;
      }
    };

    return descriptor;
  };
}
