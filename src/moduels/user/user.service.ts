import { InjectModel } from '@app/transformers/model.transform';
import { Injectable } from '@nestjs/common';
import { User } from './user.model';
import { MongooseModel } from '@app/interfaces/mongoose.interface';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User) private readonly userModel: MongooseModel<User>,
  ) {}

  /**
   * 根据ID获取用户数据
   * @param {*} id
   * @return {*}
   * @memberof UserService
   */
  getUserInfo(id) {
    return this.userModel.find({ id: id }).exec();
  }

  /**
   * 获取所有用户
   * @return {*}
   * @memberof UserService
   */
  getAllUser() {
    return this.userModel.find().exec();
  }
}
