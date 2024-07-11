import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ReflectionService } from '@grpc/reflection';
import { getServerIp } from './utils/util';
import { APP } from './config';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: ['userproto', 'authproto'],
      protoPath: [
        join(__dirname, '../protos/user.proto'),
        join(__dirname, '../protos/auth.proto'),
      ],
      url: '0.0.0.0:50052',
      onLoadPackageDefinition: (pkg, server) => {
        new ReflectionService(pkg).addToServer(server);
      },
    },
  });
  // redis 微服务
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.REDIS,
    options: {
      host: 'localhost',
      port: 6379,
    },
  });
  await app.startAllMicroservices();
  await app.listen(APP.PORT).then(() => {
    console.info(
      `Application is running on: http://${getServerIp()}:${APP.PORT}`,
    );
  });
}
bootstrap();
