import { InjectModel } from '@app/transformers/model.transform';
import { Injectable } from '@nestjs/common';
import { Log } from './log.model';
import { MongooseModel } from '@app/interfaces/mongoose.interface';
import { createLogger } from '@app/utils/logger';
import { isDevEnv } from '@app/config';
import { Site } from '../site/site.model';
import { LogRequest } from '@app/protos/log';
const Logger = createLogger({ scope: 'AuthController', time: isDevEnv });

@Injectable()
export class LogService {
  constructor(
    @InjectModel(Log) private readonly logModel: MongooseModel<Log>,
    @InjectModel(Site) private readonly siteModel: MongooseModel<Site>, // 避免循环依赖
  ) {}

  /**
   *
   * @param {LogRequest} data
   * @return {*}  {Promise<any>}
   * @memberof LogService
   */
  public async create(data: LogRequest): Promise<any> {
    console.log(data, 'data======');
    // 站点放进缓存
    const site = await this.siteModel.findById(data.siteId);
    if (!site) {
      Logger.error('站点已删除或者不存在');
      return '站点已删除或者不存在';
    }
  }
}
