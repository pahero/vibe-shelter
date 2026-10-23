import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { DatabaseModule } from "@/database/database.module";
import { AuthModule } from "@/auth/auth.module";
import { JwtAuthGuard } from "@/auth";
import { CreateUserHandler } from "./commands/create-user.handler";
import { UpdateUserHandler } from "./commands/update-user.handler";
import { DeleteUserHandler } from "./commands/delete-user.handler";
import { ListUsersHandler } from "./queries/list-users.handler";
import { GetUserHandler } from "./queries/get-user.handler";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [UsersController],
  providers: [
    CreateUserHandler,
    UpdateUserHandler,
    DeleteUserHandler,
    ListUsersHandler,
    GetUserHandler,
    JwtAuthGuard,
  ],
  exports: [
    CreateUserHandler,
    UpdateUserHandler,
    DeleteUserHandler,
    ListUsersHandler,
    GetUserHandler,
  ],
})
export class UsersModule {}
