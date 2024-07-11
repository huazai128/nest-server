import { REDIS_SERVICE } from '@app/constants/redis.constant';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class RedisMicroserviceService {
  constructor(@Inject(REDIS_SERVICE) private readonly client: ClientProxy) {}

  /**
   * 发送
   * @param {*} pattern
   * @param {*} data
   * @return {*}
   * @memberof RedisMicroserviceService
   */
  public sendData(pattern: any, data: any) {
    return this.client.send(pattern, data);
  }
}
