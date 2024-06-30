import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './processors/database/database.module';
import { UserModule } from './moduels/user/user.module';
import { ProtousersModule } from './moduels/userproto/userproto.module';

@Module({
  imports: [DatabaseModule, UserModule, ProtousersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
