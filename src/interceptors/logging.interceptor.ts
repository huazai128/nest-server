import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  Injectable,
  NestInterceptor,
  CallHandler,
  ExecutionContext,
} from '@nestjs/common';
import { createLogger } from '@app/utils/logger';
import { isDevEnv } from '@app/app.env';
const logger = createLogger({ scope: 'LoggingInterceptor', time: isDevEnv });

/**
 * rgpc 日志拦截器
 * @export
 * @class LoggingInterceptor
 * @implements {NestInterceptor}
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> {
    const call$ = next.handle();
    const request = context.switchToRpc().getData(); // 获取 gRPC 请求数据
    const content = request;
    const handler = context.getHandler();
    const className = context.getClass().name;
    logger.debug(
      '+++ req：',
      `对应的服务类：${className} +++rgpc方法：${handler.name} +++rgpc参数：`,
      content,
    );
    const now = Date.now();
    return call$.pipe(
      tap((response) => {
        logger.debug(`${handler.name}--- res：`, response);
        logger.debug(
          '--- time：',
          `${handler.name}方法耗时：${Date.now() - now}ms`,
        );
      }),
    );
  }
}
