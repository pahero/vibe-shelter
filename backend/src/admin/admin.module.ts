import { Module } from "@nestjs/common";
import { AdminUsersController } from "./admin.controller";
import { UsersModule } from "@/users/users.module";
import { AuthModule } from "@/auth/auth.module";
import { AdminRoleGuard, JwtAuthGuard } from "@/auth";
import { DatabaseModule } from "@/database/database.module";

@Module({
  imports: [UsersModule, AuthModule, DatabaseModule],
  controllers: [AdminUsersController],
  providers: [JwtAuthGuard, AdminRoleGuard],
})
export class AdminModule {}
