import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

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
