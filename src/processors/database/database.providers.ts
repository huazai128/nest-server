import { isDevEnv } from '@app/app.env';
import { createLogger } from '@app/utils/logger';
import { dbUrl } from 'config';
import { connection, disconnect, connect, set } from 'mongoose';
const logger = createLogger({ scope: 'databaseProviders', time: isDevEnv });

export const DB_CONNECTION_TOKEN = 'DB_CONNECTION_TOKEN'; // 非基于类的提供器令牌

export const databaseProviders = [
  {
    provide: DB_CONNECTION_TOKEN,
    useFactory: async () => {
      let reconnectionTask: any = null;
      const RECONNECT_INTERVAL = 6000;
      set('strictQuery', true);

      function dbConnect() {
        return connect(dbUrl);
      }

      connection.on('disconnected', () => {
        reconnectionTask = setTimeout(dbConnect, RECONNECT_INTERVAL);
      });

      connection.on('open', () => {
        logger.info('mongodb数据库连接成功');
        clearTimeout(reconnectionTask);
        reconnectionTask = null;
      });

      connection.on('error', (error) => {
        logger.error('数据库连接异常', error);
        disconnect();
      });

      return dbConnect();
    },
    inject: [],
  },
];
