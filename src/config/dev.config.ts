import { ConfigServer } from '@app/interfaces/config.interface';

const config: ConfigServer = {
  redisConf: {
    host: 'localhost',
    port: 6379,
  },
  grpcUrl: '0.0.0.0:50052',
};

export default config;
