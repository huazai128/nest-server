import { REDIS_SERVICE } from '@app/constants/redis.constant';
import { Global, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RedisMicroserviceService } from './redis.microservice.service';
import { CONFIG } from '@app/config';

@Global()
@Module({
  imports: [
    //  redis 微服务数据
    ClientsModule.register([
      {
        name: REDIS_SERVICE,
        transport: Transport.REDIS,
        options: CONFIG.redisConf,
      },
    ]),
  ],
  providers: [RedisMicroserviceService],
  exports: [RedisMicroserviceService],
})
export class MicroserviceModule {}
