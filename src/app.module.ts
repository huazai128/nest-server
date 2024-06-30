import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './processors/database/database.module';
import modules from '@app/moduels';

@Module({
  imports: [DatabaseModule, ...modules],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
