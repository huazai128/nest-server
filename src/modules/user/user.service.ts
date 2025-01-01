import { MongooseID, MongooseModel } from '@app/interfaces/mongoose.interface';
import { InjectModel } from '@app/transformers/model.transform';
import { Injectable } from '@nestjs/common';
import { UserLog } from './user.model';
import { PaginateOptions, PipelineStage, Types } from 'mongoose';
import logger from '@app/utils/logger';
import { PaginateQuery } from '@app/interfaces/paginate.interface';
// import { HelperServiceAlarn } from '@app/processors/helper/helper.service.alarm';
import { Cron } from '@nestjs/schedule';
import dayjs from 'dayjs';

@Injectable()
export class UserLogService {
  constructor(
    @InjectModel(UserLog) private readonly userLogModel: MongooseModel<UserLog>,
    // private readonly alarnService: HelperServiceAlarn,
  ) {}

  /**
   * 保存错误信息，后续改成关联表
   * @param {UserLog} data
   * @return {*}  {Promise<Types.ObjectId>}
   * @memberof UserLogService
   */
  async create(data: UserLog): Promise<Types.ObjectId> {
    try {
      // this.alarnService.sendUserLogAlarm(data);
      const res = await this.userLogModel.create(data);
      return res._id;
    } catch (error) {
      logger.error('UserLog 保存失败', JSON.stringify(data), error);
      throw new Error(`UserLog 保存失败 ${error}`);
    }
  }

  /**
   * 根据站点ID查询用户提交错误数据
   * @param {PaginateQuery<UserLog>} paginateQuery
   * @param {PaginateOptions} paginateOptions
   * @return {*}
   * @memberof UserLogService
   */
  public async paginate(
    paginateQuery: PaginateQuery<UserLog>,
    paginateOptions: PaginateOptions,
  ) {
    return this.userLogModel.paginate(paginateQuery, paginateOptions);
  }

  /**
   * 统计用户提交错误数据
   * @param {PipelineStage[]} pipeParams
   * @return {*}
   * @memberof UserLogService
   */
  public async aggregate(pipeParams: PipelineStage[]) {
    return this.userLogModel
      .aggregate(pipeParams)
      .then((data) => {
        return data;
      })
      .catch((err) => {
        logger.error('Error聚合错误', err);
        return Promise.reject(err);
      });
  }

  /**
   * 根据站点ID删除相关API上报
   * @param {MongooseID} siteId
   * @return {*}
   * @memberof UserLogService
   */
  public async siteIdRemove(siteId: MongooseID) {
    const apiResult = await this.userLogModel
      .deleteMany({ siteId: siteId })
      .exec();
    return apiResult;
  }

  /**
   * 批量删除
   * @param {MongooseID[]} ids
   * @return {*}
   * @memberof UserLogService
   */
  public async batchDelete(ids: MongooseID[]) {
    const apiResult = await this.userLogModel
      .deleteMany({ _id: { $in: ids } })
      .exec();
    return apiResult;
  }

  /**
   * 根据ID获取错误信息
   * @param {number} id
   * @return {*}
   * @memberof UserLogService
   */
  public getIdByInfo(id: number) {
    return this.userLogModel
      .findOne({ id: id })
      .select('breadcrumbs errorList events')
      .exec();
  }

  /**
   * 删除10天前的数据
   * @private
   * @memberof WebLogService
   */
  private deleteThirtyDayData = async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 10);
    const res = await this.userLogModel
      .deleteMany({ create_at: { $lt: thirtyDaysAgo } })
      .exec();
    logger.info('user删除结果', res);
  };

  /**
   * 调度任务
   * @private
   * @memberof WebLogService
   */
  @Cron('0 * * * *') // 每天凌晨
  private handleScheduleJob() {
    logger.info('user触发时间', dayjs().format('YYYY-MM-DD HH:mm:ss'));
    this.deleteThirtyDayData();
  }
}
