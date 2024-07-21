import { Controller } from '@nestjs/common';
import { GrpcMethod, MessagePattern } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import {
  LoginResponse,
  LoginRequest,
  ValidateUserRequest,
} from '@app/protos/auth';

@Controller('user')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * grpc 登录
   * @param {LoginRequest} data
   * @return {*}  {Promise<LoginResponse>}
   * @memberof AuthController
   */
  @GrpcMethod('AuthService', 'login')
  async login(data: LoginRequest): Promise<LoginResponse> {
    const res = await this.authService.login(data);
    return res;
  }

  /**
   * grpc 验证用户
   * @param {ValidateUserRequest} data
   * @return {*}
   * @memberof AuthController
   */
  @GrpcMethod('AuthService', 'validateUser')
  async validateUser(data: ValidateUserRequest) {
    const res = await this.authService.validateUser(data);

    return res;
  }

  /**
   * 根据Id 获取用户信息
   * @param {ValidateUserRequest} data
   * @return {*}
   * @memberof AuthController
   */
  @GrpcMethod('AuthService', 'getUserById')
  async getUserById(data: ValidateUserRequest) {
    const res = await this.authService.getFindUserId(data.userId);
    return res;
  }

  /**
   * redis 微服务
   * @return {*}
   * @memberof AuthController
   */
  @MessagePattern({ cmd: 'getUserListRes' })
  async getUserList() {
    const userList = [{ id: 1, name: '测试der' }];
    console.log(userList, '=====');
    return { userList };
  }
}
