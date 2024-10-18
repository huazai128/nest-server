import { Module } from '@nestjs/common';
import modules from '@app/moduels';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from '@app/processors/database/database.module';
import { MicroserviceModule } from '@app/processors/microservices/microservice.module';
@Module({
  imports: [DatabaseModule, MicroserviceModule, ...modules],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
