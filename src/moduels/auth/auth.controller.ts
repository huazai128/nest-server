import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import {
  LoginResponse,
  LoginRequest,
  ValidateUserRequest,
  TokenRequest,
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
   * 生成token
   * @param {TokenRequest} data
   * @return {*}
   * @memberof AuthController
   */
  @GrpcMethod('AuthService', 'creatToken')
  async creatToken(data: TokenRequest) {
    const res = await this.authService.creatToken(data);
    return res;
  }
}
