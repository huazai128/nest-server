import { isDevEnv } from '@app/app.env';
import { createLogger } from '@app/utils/logger';
import { dbUrl } from 'config';
import { connection, disconnect, connect, set } from 'mongoose';
const logger = createLogger({ scope: 'databaseProviders', time: isDevEnv });

/**
 * 数据库连接令牌
 * @author dylan
 */
export const DB_CONNECTION_TOKEN = 'DB_CONNECTION_TOKEN';

/**
 * 数据库提供者配置
 * @author dylan
 */
export const databaseProviders = [
  {
    provide: DB_CONNECTION_TOKEN,
    useFactory: async () => {
      // 重连任务
      let reconnectionTask: any = null;
      // 重连间隔时间(ms)
      const RECONNECT_INTERVAL = 6000;
      // 设置严格查询模式
      set('strictQuery', true);

      /**
       * 数据库连接方法
       */
      function dbConnect() {
        return connect(dbUrl);
      }

      // 监听断开连接事件
      connection.on('disconnected', () => {
        reconnectionTask = setTimeout(dbConnect, RECONNECT_INTERVAL);
      });

      // 监听连接成功事件
      connection.on('open', () => {
        logger.info('mongodb数据库连接成功');
        clearTimeout(reconnectionTask);
        reconnectionTask = null;
      });

      // 监听连接错误事件
      connection.on('error', (error) => {
        logger.error('数据库连接异常', error);
        disconnect();
      });

      return dbConnect();
    },
    inject: [],
  },
];
