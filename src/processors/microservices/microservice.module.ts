import { REDIS_SERVICE } from '@app/constants/redis.constant';
import { Global, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RedisMicroserviceService } from './redis.microservice.service';

@Global()
@Module({
  imports: [
    ClientsModule.register([
      {
        name: REDIS_SERVICE,
        transport: Transport.REDIS,
        options: {
          host: 'localhost',
          port: 6379,
        },
      },
    ]),
  ],
  providers: [RedisMicroserviceService],
  exports: [RedisMicroserviceService],
})
export class MicroserviceModule {}
