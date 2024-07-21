import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { of } from 'rxjs';

/**
 * 用于测试和验证 gRPC 相关技术
 * @export
 * @class ProtousersController
 */
@Controller()
export class ProtousersController {
  @GrpcMethod('UserService', 'getUsers')
  getUsers() {
    console.log(new Date());
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
  //
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
}
