import { Module } from '@nestjs/common';
import modules from '@app/modules';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from '@app/processors/database/database.module';
import { MicroserviceModule } from '@app/processors/microservices/microservice.module';
import { HelperModule } from './processors/helper/helper.module';
import { RedisCoreModule } from './processors/redis/redis.module';
import { CONFIG } from './config';
@Module({
  imports: [
    RedisCoreModule.forRoot(CONFIG.redis),
    DatabaseModule,
    MicroserviceModule,
    HelperModule,
    ...modules,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
