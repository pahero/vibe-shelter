import { Module, forwardRef } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './strategies/google.strategy';
import { DatabaseModule } from '@/database/database.module';
import { UsersModule } from '@/users/users.module';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { AdminRoleGuard } from './guards/admin-role.guard';

@Module({
  imports: [PassportModule, DatabaseModule, forwardRef(() => UsersModule)],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy, SessionAuthGuard, AdminRoleGuard],
  exports: [AuthService, SessionAuthGuard, AdminRoleGuard],
})
export class AuthModule {}
