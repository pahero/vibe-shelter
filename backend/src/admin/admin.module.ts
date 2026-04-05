import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin.controller';
import { UsersModule } from '@/users/users.module';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [UsersModule, AuthModule],
  controllers: [AdminUsersController],
})
export class AdminModule {}
