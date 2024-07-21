import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

/**
 * 用于测试和验证 gRPC
 * @export
 * @class ProtousersController
 */
@Controller('protousers')
export class ProtousersController {
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
}
