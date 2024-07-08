import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthProvider } from './auth.model';

@Module({
  imports: [],
  controllers: [AuthController],
  providers: [AuthProvider, AuthService],
})
export class AuthModule {}
