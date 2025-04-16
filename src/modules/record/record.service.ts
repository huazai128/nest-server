import { Injectable } from '@nestjs/common';
import { InjectModel } from '@app/transformers/model.transform';
import { MongooseModel } from '@app/interfaces/mongoose.interface';
import { Record } from './record.model';
import { createLogger } from '@app/utils/logger';
import { Cron } from '@nestjs/schedule';

const logger = createLogger({ scope: 'RecordService' });

@Injectable()
export class RecordService {
  constructor(
    @InjectModel(Record) private readonly recordModel: MongooseModel<Record>,
  ) {}

  /**
   * 创建录制记录
   * @param data
   * @returns
   */
  async create(data: Partial<Record>): Promise<Record> {
    try {
      logger.log('record===', data);
      const record = await this.recordModel.create(data);
      return record;
    } catch (error) {
      logger.error('创建录制记录失败:', error);
      throw error;
    }
  }

  /**
   * 根据monitorId查询记录
   * @param monitorId
   * @returns
   */
  async findByMonitorId(monitorId: string): Promise<Record | null> {
    return this.recordModel.findOne({ monitorId }).exec();
  }

  /**
   * 根据monitorId查询记录
   * @param monitorIds
   * @returns
   */
  async findByMonitorIds(monitorIds: string[]): Promise<Record[]> {
    return this.recordModel.find({ monitorId: { $in: monitorIds } }).exec();
  }

  /**
   * 定时删除7天前的数据
   */
  @Cron('0 0 0 * * *') // 每天0点执行
  async cleanOldRecords() {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const result = await this.recordModel.deleteMany({
        create_at: { $lt: sevenDaysAgo },
      });

      logger.info(`已删除 ${result.deletedCount} 条7天前的记录`);
    } catch (error) {
      logger.error('删除旧记录失败:', error);
    }
  }
}
