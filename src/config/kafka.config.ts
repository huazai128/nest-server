import { isDevEnv } from '@app/app.env';
import { MONITOR_TOPIC } from '@app/constants/kafka.contant';
import { CustomClientOptions } from '@nestjs/microservices';
import { Partitioners } from 'kafkajs';
import * as net from 'net';
import * as os from 'os';

const kafkaInstanceId = process.env.NODE_APP_INSTANCE ?? process.pid;
const kafkaPartitionsConsumedConcurrently = Number(
  process.env.KAFKA_PARTITIONS_CONCURRENTLY || 6,
);

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** 生产/测试环境始终启用；开发环境默认关闭，避免 bootstrap 代理下 consumer coordinator 报错 */
export const isKafkaConsumerEnabled = (): boolean => {
  if (!isDevEnv) {
    return true;
  }
  return process.env.KAFKA_ENABLE_CONSUMER === 'true';
};

/** 开发环境使用独立 group，避免本地调试影响线上 consumer group */
export const getKafkaConsumerGroupId = (): string => {
  const base = 'monitor-consumer';
  if (!isDevEnv) {
    return base;
  }
  const suffix =
    process.env.KAFKA_CONSUMER_GROUP_SUFFIX ||
    os.hostname() ||
    String(process.pid);
  return `${base}-dev-${suffix}`;
};

export const resolveKafkaBrokers = (defaultBrokers: string[]): string[] => {
  const envBrokers = process.env.KAFKA_BROKERS;
  if (!envBrokers) {
    return defaultBrokers;
  }
  return envBrokers
    .split(',')
    .map((broker) => broker.trim())
    .filter(Boolean);
};

/**
 * dev 环境 Kafka 常把 metadata 指向内网 broker，本地不可达。
 * 将所有 broker 连接重定向到 bootstrap，适用于 bootstrap 代理全集群流量的场景。
 */
const createBootstrapRedirectSocketFactory = (
  bootstrapHost: string,
  bootstrapPort: number,
) => {
  return ({ onConnect }: { onConnect: () => void }) => {
    return net.connect(
      { host: bootstrapHost, port: bootstrapPort },
      onConnect,
    );
  };
};

export const buildKafkaClientConfig = (brokers: string[]) => {
  const client = {
    clientId: 'markiMonitorId',
    brokers,
    connectionTimeout: 30000,
    requestTimeout: 60000,
    retry: {
      initialRetryTime: 500,
      retries: 10,
    },
  } as Record<string, any>;

  if (
    isDevEnv &&
    process.env.KAFKA_BOOTSTRAP_REDIRECT !== 'false' &&
    brokers.length
  ) {
    const [host, port = '9092'] = brokers[0].split(':');
    client.socketFactory = createBootstrapRedirectSocketFactory(
      host,
      Number(port),
    );
  }

  return client;
};

export const createKafkaOptions = (
  brokers: string[],
): CustomClientOptions['options'] => {
  const resolvedBrokers = resolveKafkaBrokers(brokers);

  return {
    client: buildKafkaClientConfig(resolvedBrokers),
    subscribe: {
      topics: [MONITOR_TOPIC],
      fromBeginning: false,
    },
    producer: {
      createPartitioner: Partitioners.LegacyPartitioner,
      allowAutoTopicCreation: false,
      retry: {
        retries: 2,
        initialRetryTime: 100,
      },
    },
    send: {
      acks: 0,
      timeout: 30000,
    },
    consumer: {
      groupId: getKafkaConsumerGroupId(),
      sessionTimeout: 120000,
      heartbeatInterval: 3000,
      rebalanceTimeout: 120000,
      maxWaitTimeInMs: 500,
      maxBytesPerPartition:
        Number(process.env.KAFKA_MAX_BYTES_PER_PARTITION) || 1048576,
    },
    run: {
      autoCommit: false,
      partitionsConsumedConcurrently: Number.isFinite(
        kafkaPartitionsConsumedConcurrently,
      )
        ? Math.max(1, kafkaPartitionsConsumedConcurrently)
        : 3,
    },
  };
};

export const getKafkaServerOptions = (
  options: CustomClientOptions['options'],
) => ({
  ...options,
  client: {
    ...options?.client,
    clientId: `markiMonitorId-${kafkaInstanceId}`,
  },
  producerOnlyMode: !isKafkaConsumerEnabled(),
  run: {
    autoCommit: false,
    ...(options as any)?.run,
  },
});

export const startKafkaMicroserviceWithRetry = async (
  startMicroservices: () => Promise<void>,
  brokers: string[] = [],
  maxRetries = 20,
) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await startMicroservices();
      return true;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      await sleep(Math.min(attempt * 2000, 10000));
    }
  }
  return false;
};
