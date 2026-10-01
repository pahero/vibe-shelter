import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CreateUserHandler } from "@/users/commands/create-user.handler";
import { UpdateUserHandler } from "@/users/commands/update-user.handler";
import { DeleteUserHandler } from "@/users/commands/delete-user.handler";
import { ListUsersHandler } from "@/users/queries/list-users.handler";
import { GetUserHandler } from "@/users/queries/get-user.handler";
import { AdminRoleGuard, SessionAuthGuard } from "@/auth";
import { CreateUserDto, UpdateUserDto, UserResponseDto } from "@/auth/dto";

@Controller("admin/users")
@UseGuards(SessionAuthGuard, AdminRoleGuard)
export class AdminUsersController {
  constructor(
    private readonly createUserHandler: CreateUserHandler,
    private readonly updateUserHandler: UpdateUserHandler,
    private readonly deleteUserHandler: DeleteUserHandler,
    private readonly listUsersHandler: ListUsersHandler,
    private readonly getUserHandler: GetUserHandler,
  ) {}

  @Post()
  async createUser(
    @Body() createUserDto: CreateUserDto,
  ): Promise<{ id: string }> {
    return this.createUserHandler.handle(createUserDto.toCommand());
  }

  @Get()
  async getAll(
    @Query("status") status?: string,
    @Query("role") role?: string,
  ): Promise<UserResponseDto[]> {
    return this.listUsersHandler.handle({ status, role });
  }

  @Get(":id")
  async getById(@Param("id") id: string): Promise<UserResponseDto> {
    return this.getUserHandler.handle(id);
  }

  @Patch(":id")
  async updateUser(
    @Param("id") id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<{ id: string }> {
    return this.updateUserHandler.handle(id, updateUserDto.toCommand());
  }

  @Patch(":id/status")
  async updateUserStatus(
    @Param("id") id: string,
    @Body() body: { status: "active" | "inactive" },
  ): Promise<{ id: string }> {
    return this.updateUserHandler.handle(id, { status: body.status });
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param("id") id: string): Promise<void> {
    await this.deleteUserHandler.handle(id);
  }
}
