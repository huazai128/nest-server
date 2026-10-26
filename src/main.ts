import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ReflectionService } from '@grpc/reflection';
import { getServerIp } from './utils/util';
import { APP, CONFIG } from './config';
import { join } from 'path';
import { PROTOPACKAGE, PROTOPATH } from './constants/proto.contant';
import {
  getKafkaServerOptions,
  isKafkaConsumerEnabled,
  resolveKafkaBrokers,
  startKafkaMicroserviceWithRetry,
} from './config/kafka.config';
import { createLogger } from './utils/logger';
import { isDevEnv } from './app.env';

const logger = createLogger({ scope: 'Bootstrap', time: true });

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: PROTOPACKAGE,
      protoPath: PROTOPATH,
      loader: {
        includeDirs: [join(__dirname, '../protos')],
        keepCase: true,
      },
      url: CONFIG.grpcUrl,
      onLoadPackageDefinition: (pkg, server) => {
        new ReflectionService(pkg).addToServer(server);
      },
    },
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.REDIS,
    options: CONFIG.redisConf,
  });

  const kafkaEnabled = isKafkaConsumerEnabled() && !!CONFIG.kafkaOptions;
  if (kafkaEnabled) {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.KAFKA,
      options: getKafkaServerOptions(CONFIG.kafkaOptions as any),
    });
  }

  const kafkaBrokers = resolveKafkaBrokers(
    ((CONFIG.kafkaOptions as any)?.client?.brokers as string[]) || [],
  );
  logger.info(
    `Kafka consumer: enabled=${kafkaEnabled}, brokers=${kafkaBrokers.join(',')}`,
  );

  try {
    if (kafkaEnabled) {
      await startKafkaMicroserviceWithRetry(async () => {
        await app.startAllMicroservices();
      }, kafkaBrokers);
    } else {
      await app.startAllMicroservices();
    }
    logger.info('gRPC / Redis / Kafka 微服务已就绪');
  } catch (error) {
    logger.error(
      '微服务启动失败（请检查 Kafka broker / KAFKA_BROKERS）',
      error,
    );
    throw error;
  }

  if (isDevEnv && !kafkaEnabled) {
    logger.info(
      '开发环境未启 Kafka consumer；BFF 上报将走 gRPC 直写。启用消费请设 KAFKA_ENABLE_CONSUMER=true',
    );
  }

  await app.listen(APP.PORT);
  console.info(
    `Application is running on: http://${getServerIp()}:${APP.PORT}`,
  );
}
bootstrap();
