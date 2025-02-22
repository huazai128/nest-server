import { Injectable } from '@nestjs/common';
import { Auth } from './auth.model';
import { InjectModel } from '@app/transformers/model.transform';
import { MongooseID, MongooseModel } from '@app/interfaces/mongoose.interface';
import { decodeBase64, decodeMd5 } from '@app/utils/util';
import { LoginInfo } from '@app/interfaces/auth.interface';
import { LoginRequest, ValidateUserRequest } from '@app/protos/auth';
import { MeasureAsyncTime } from '@app/decorators/async.decorator';

@Injectable()
export class AuthService {
  constructor(@InjectModel(Auth) private authModel: MongooseModel<Auth>) {}

  /**
   * 验证用户
   * @param {ValidateUserRequest} { userId }
   * @return {*}
   * @memberof AuthService
   */
  @MeasureAsyncTime()
  public async validateUser({ userId }: ValidateUserRequest) {
    return await this.getFindUserId(userId);
  }

  /**
   * 根据userId 查找用户信息
   * @param {number} userId
   * @return {*}
   * @memberof AuthService
   */
  @MeasureAsyncTime()
  public async getFindUserId(userId: number) {
    return await this.authModel.findOne({ userId: userId }).exec();
  }

  /**
   * 登录服务
   * @param {LoginRequest} auth
   * @return {*}  {Promise<LoginInfo>}
   * @memberof AuthService
   */
  @MeasureAsyncTime()
  public async login(auth: LoginRequest): Promise<LoginInfo> {
    const existAuth = await this.authModel.findOne(
      { account: auth.account },
      '+password',
    );
    const password = decodeMd5(decodeBase64(auth.password));
    if (existAuth?.password !== password) {
      throw '账号有误，请确认!';
    }
    return {
      account: existAuth.account,
      userId: existAuth.userId,
    };
  }

  /**
   * 根据ID查询用户
   * @param {MongooseID} id
   * @return {*}  {(Promise<Auth | null>)}
   * @memberof AuthService
   */
  @MeasureAsyncTime()
  public async findById(id: MongooseID): Promise<Auth | null> {
    const userInfo = await this.authModel.findById(id);
    return userInfo;
  }

  /**
   * 新建账号
   * @param {LoginRequest} auth
   * @return {*}
   * @memberof AuthService
   */
  @MeasureAsyncTime()
  public async createUser(auth: LoginRequest) {
    const newPassword = decodeMd5(decodeBase64(auth.password));
    const existedAuth = await this.authModel
      .findOne({ account: auth.account })
      .exec();
    if (existedAuth) {
      throw '账户已存在';
    }
    return await this.authModel.create({
      account: auth.account,
      password: newPassword,
    });
  }
}
