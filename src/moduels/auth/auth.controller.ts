import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { LoginReuset } from '@app/types/auth';

@Controller('user')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @GrpcMethod('AuthService', 'login')
  async login(data: LoginReuset) {
    const res = await this.authService.login(data);
    return res;
  }
}
