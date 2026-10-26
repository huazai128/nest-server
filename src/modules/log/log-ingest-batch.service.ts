import { Injectable } from '@nestjs/common';
import { KafkaContext } from '@nestjs/microservices';
import { SaveLogRequest } from '@app/protos/log';
import { LogService, PoisonMessageError } from './log.service';
import { createLogger } from '@app/utils/logger';

const logger = createLogger({ scope: 'LogIngestBatchService', time: true });

const BATCH_ENABLED = process.env.INGEST_BATCH_ENABLED !== 'false';
const BATCH_SIZE = Math.max(1, Number(process.env.INGEST_BATCH_SIZE) || 32);
const BATCH_MS = Math.max(10, Number(process.env.INGEST_BATCH_MS) || 50);

type PendingItem = {
  data: SaveLogRequest;
  context: KafkaContext;
  resolve: () => void;
  reject: (error: unknown) => void;
};

@Injectable()
export class LogIngestBatchService {
  private readonly queues = new Map<string, PendingItem[]>();
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly flushing = new Set<string>();

  constructor(private readonly logService: LogService) {}

  async ingest(data: SaveLogRequest, context: KafkaContext): Promise<void> {
    if (!BATCH_ENABLED) {
      await this.processOne(data, context);
      return;
    }
    return new Promise<void>((resolve, reject) => {
      const key = `${context.getTopic()}:${context.getPartition()}`;
      const queue = this.queues.get(key) || [];
      queue.push({ data, context, resolve, reject });
      this.queues.set(key, queue);
      if (queue.length >= BATCH_SIZE) {
        void this.flush(key);
        return;
      }
      if (!this.timers.has(key)) {
        this.timers.set(
          key,
          setTimeout(() => {
            this.timers.delete(key);
            void this.flush(key);
          }, BATCH_MS),
        );
      }
    });
  }

  private async flush(key: string): Promise<void> {
    if (this.flushing.has(key)) {
      return;
    }
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
    const batch = this.queues.get(key) || [];
    if (!batch.length) {
      return;
    }
    this.queues.set(key, []);
    this.flushing.add(key);
    try {
      for (const item of batch) {
        try {
          await this.processOne(item.data, item.context);
          item.resolve();
        } catch (error) {
          item.reject(error);
        }
      }
    } finally {
      this.flushing.delete(key);
      if ((this.queues.get(key) || []).length) {
        void this.flush(key);
      }
    }
  }

  private async processOne(
    data: SaveLogRequest,
    context: KafkaContext,
  ): Promise<void> {
    try {
      await this.logService.create(data);
      await this.commit(context);
    } catch (error) {
      if (error instanceof PoisonMessageError) {
        logger.error('毒消息跳过并提交 offset', error.message);
        await this.commit(context);
        return;
      }
      throw error;
    }
  }

  private async commit(context: KafkaContext): Promise<void> {
    const { offset } = context.getMessage();
    const consumer = context.getConsumer();
    await consumer.commitOffsets([
      {
        topic: context.getTopic(),
        partition: context.getPartition(),
        offset: String(Number(offset) + 1),
      },
    ]);
  }
}
