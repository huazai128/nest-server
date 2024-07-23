import { Controller } from '@nestjs/common';
import {
  GrpcMethod,
  GrpcStreamCall,
  GrpcStreamMethod,
} from '@nestjs/microservices';
import { Observable, of, Subject } from 'rxjs';

/**
 * 用于测试和验证 gRPC 相关技术
 * @export
 * @class ProtousersController
 */
@Controller()
export class ProtousersController {
  private readonly items: any[] = [
    { id: 1, itemTypes: [1] },
    { id: 2, itemTypes: [0] },
    { id: 3, itemTypes: [0] },
    { id: 4, itemTypes: [1] },
  ];
  @GrpcMethod('UserService', 'getUsers')
  getUsers() {
    return {
      users: [
        {
          id: 1,
          name: 'dada11112',
          createdAt: new Date(),
        },
      ],
    };
  }
  // 用于与 gRPC 通信进行一次性数据传输。
  @GrpcMethod('UserService', 'find')
  find() {
    return of({
      id: 1,
      itemTypes: [1],
      shipmentType: {
        from: 'test',
        to: 'test1',
        carrier: 'test-carrier',
      },
    });
  }

  // 用于与 gRPC 通信进行流式数据传输。参数接收一个Observable(可观察对象)
  @GrpcStreamMethod('UserService', 'sync')
  async sync(data$: Observable<any>): Promise<any> {
    // 创建一个多播，用于处理流式数据的传输
    const hero$ = new Subject<any>();
    // 根据data$ 处理next 获取值
    const onNext = (heroById: any) => {
      const item = this.items.find(({ id }) => id === heroById.id);
      // 通过data$ 触发next 获取值，然后便利获取对象，hero$传递。
      hero$.next(item);
    };
    //  等data$ 完成触发complete， hero$也结束
    const onComplete = () => hero$.complete();
    data$.subscribe({
      next: onNext,
      complete: onComplete,
    });

    // 返回值就是一个表示数据流的 Observable 对象，用于向 gRPC 客户端发送流式响应数据。
    return hero$.asObservable(); // 返回的是hero$
  }

  // 用于与 gRPC 通信进行流式数据传输。参数接收一个Observable(可观察对象)
  @GrpcStreamMethod('UserService', 'streamReq')
  streamReq(messages: Observable<any>) {
    const s = new Subject();
    const o = s.asObservable();
    messages.subscribe({
      next: () => {
        s.next({
          id: 1,
          itemTypes: [2],
        });
      },
      complete: () => s.complete(),
    });
    return o;
  }

  @GrpcStreamCall('UserService', 'streamReqCall')
  // eslint-disable-next-line @typescript-eslint/ban-types
  async streamReqCall(stream: any, callback: (...args) => any) {
    stream.on('data', (msg: any) => {
      console.log(msg);
    });
    stream.on('end', () => {
      callback(null, {
        id: 2,
        itemTypes: [1],
      });
    });
  }
}
