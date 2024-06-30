import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserProvider } from './user.model';

@Module({
    imports: [],
    controllers: [UserController],
    providers: [UserProvider]
    
})
export class UserModule {}
