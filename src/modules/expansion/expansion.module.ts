import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ExpansionController } from './expansion.controller';
import { ExpansionServiceUpload } from './expansion.service.upload';
import { MulterConfig } from './multer.config';
@Module({
  imports: [
    MulterModule.registerAsync({
      useClass: MulterConfig,
    }),
  ],
  controllers: [ExpansionController],
  providers: [ExpansionServiceUpload],
  exports: [ExpansionServiceUpload],
})
export class ExpansionModule {}
