import { dbUrl } from 'config';
import { connection, disconnect, connect, set } from 'mongoose';

export const DB_CONNECTION_TOKEN = 'DB_CONNECTION_TOKEN';

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
        console.info('mongodb数据库连接成功');
        clearTimeout(reconnectionTask);
        reconnectionTask = null;
      });

      connection.on('error', (error) => {
        console.error('数据库连接异常', error);
        disconnect();
      });

      return dbConnect();
    },
    inject: [],
  },
];
