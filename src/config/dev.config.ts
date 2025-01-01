import { ConfigServer } from '@app/interfaces/config.interface';

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
};

export default config;
