import { ConfigServer } from '@app/interfaces/config.interface';
import { createKafkaOptions } from './kafka.config';

const config: ConfigServer = {
  redisConf: {
    host: 'localhost',
    port: 6379,
  },
  grpcUrl: '0.0.0.0:50052',
  pageUrl: 'http://localhost:3005',
  redis: {
    type: 'single',
    url: 'redis://localhost:6379',
  },
  kafkaOptions: createKafkaOptions(
    (process.env.KAFKA_BROKERS || '127.0.0.1:9092')
      .split(',')
      .map((b) => b.trim()),
  ),
};

export default config;
