import { Controller } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  KafkaContext,
  Payload,
} from '@nestjs/microservices';
import { MONITOR_TOPIC } from '@app/constants/kafka.contant';
import { SaveLogRequest } from '@app/protos/log';
import { PoisonMessageError } from './log.service';
import { LogIngestBatchService } from './log-ingest-batch.service';

@Controller()
export class LogKafkaController {
  constructor(private readonly ingestBatch: LogIngestBatchService) {}

  @EventPattern(MONITOR_TOPIC)
  async handleMessage(
    @Payload() payload: SaveLogRequest | string,
    @Ctx() context: KafkaContext,
  ) {
    const logData = this.parseKafkaPayload(payload);
    await this.ingestBatch.ingest(logData, context);
  }

  private parseKafkaPayload(
    payload: SaveLogRequest | string,
  ): SaveLogRequest {
    if (typeof payload !== 'string') {
      return payload;
    }
    try {
      return JSON.parse(payload) as SaveLogRequest;
    } catch (error) {
      throw new PoisonMessageError(
        `Kafka 消息 JSON 解析失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
