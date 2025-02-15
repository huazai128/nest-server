import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HelperServiceIp } from './helper.service.ip';
import { HelperServiceAlarn } from './helper.service.alarm';
import { HelperServiceServerAlarm } from './helper.service.serverAlarm';

const services = [
  HelperServiceIp,
  HelperServiceAlarn,
  HelperServiceServerAlarm,
];

@Global()
@Module({
  imports: [HttpModule],
  providers: services,
  exports: services,
})
export class HelperModule {}
