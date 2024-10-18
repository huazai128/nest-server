import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  Injectable,
  NestInterceptor,
  CallHandler,
  ExecutionContext,
} from '@nestjs/common';

/**
 * 针对rgpc 返回包含分页返回数据格式
 * @export
 * @class PaginationInterceptor
 * @implements {NestInterceptor}
 */
@Injectable()
export class PaginationInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> {
    const call$ = next.handle();
    return call$.pipe(
      map(({ docs, ...data }: any) => ({
        data: docs,
        pagination: data,
      })),
    );
  }
}
