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
import { AdminRoleGuard, CurrentUser, JwtAuthGuard } from "@/auth";
import { CreateUserDto, UpdateUserDto, UserResponseDto } from "@/auth/dto";

@Controller("admin/users")
@UseGuards(JwtAuthGuard, AdminRoleGuard)
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
    @CurrentUser() user: Express.User,
  ): Promise<{ id: string }> {
    return this.createUserHandler.handle(createUserDto.toCommand(), { role: user.role });
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
    @CurrentUser() user: Express.User,
  ): Promise<{ id: string }> {
    return this.updateUserHandler.handle(id, updateUserDto.toCommand(), { id: user.id, role: user.role });
  }

  @Patch(":id/status")
  async updateUserStatus(
    @Param("id") id: string,
    @Body() body: { status: "active" | "inactive" },
    @CurrentUser() user: Express.User,
  ): Promise<{ id: string }> {
    return this.updateUserHandler.handle(id, { status: body.status }, { id: user.id, role: user.role });
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param("id") id: string): Promise<void> {
    await this.deleteUserHandler.handle(id);
  }
}
