import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ReflectionService } from '@grpc/reflection';
import { getServerIp } from './utils/util';
import { APP, CONFIG } from './config';
import { join } from 'path';
import { PROTOPACKAGE, PROTOPATH } from './constants/proto.contant';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // grpc 微服务
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      // 这种方法 引用存在 import 时会报错，如import public "orders/service.proto";
      // protoPath: [
      //   join(__dirname, '../protos/user.proto'),
      //   join(__dirname, '../protos/auth.proto'),
      // ],
      // 每次新增proto 都要在这里配置
      package: PROTOPACKAGE,
      protoPath: PROTOPATH,
      loader: {
        includeDirs: [join(__dirname, '../protos')],
        keepCase: true,
      },
      url: CONFIG.grpcUrl,
      // gRPC 反射
      onLoadPackageDefinition: (pkg, server) => {
        // nodev22 版本运行这里会报错 issues: https://github.com/protobufjs/protobuf.js/issues/2025
        // ReflectionService的作用是向gRPC客户端提供有关gRPC服务的元数据信息。它允许客户端查询和发现可用的gRPC服务，以及服务中的方法、消息类型和其他元数据。ReflectionService提供的元数据信息可以用于自动生成客户端代码、动态调用gRPC服务方法以及进行服务发现和探测等。
        new ReflectionService(pkg).addToServer(server);
      },
    },
  });

  // redis 微服务
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.REDIS,
    options: CONFIG.redisConf,
  });
  // app.useGlobalInterceptors(new LoggingInterceptor());
  // // 对应微服务全局配置，配置无效
  // microservice.useGlobalInterceptors(new LoggingInterceptor());

  await app.startAllMicroservices();
  await app.listen(APP.PORT).then(() => {
    console.info(
      `Application is running on: http://${getServerIp()}:${APP.PORT}`,
    );
  });
}
bootstrap();
