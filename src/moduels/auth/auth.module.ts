import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthProvider } from './auth.model';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AUTH } from '@app/config';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      privateKey: AUTH.jwtTokenSecret,
      signOptions: {
        expiresIn: AUTH.expiresIn as number,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthProvider, AuthService],
})
export class AuthModule {}
