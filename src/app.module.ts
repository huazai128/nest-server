import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from '@app/processors/database/database.module';
import modules from '@app/moduels';
import { MicroserviceModule } from '@app/processors/microservices/microservice.module';

@Module({
  imports: [DatabaseModule, MicroserviceModule, ...modules],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
