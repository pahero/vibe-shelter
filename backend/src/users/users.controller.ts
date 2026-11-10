import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { UserResponseDto } from "@/auth/dto";
import { CurrentUser, JwtAuthGuard } from "@/auth";
import { ListUsersHandler } from "./queries/list-users.handler";
import { GetUserHandler } from "./queries/get-user.handler";
import { ListReminderReceiversHandler } from "./queries/list-reminder-receivers.handler";

@Controller("users")
export class UsersController {
  constructor(
    private readonly listUsersHandler: ListUsersHandler,
    private readonly getUserHandler: GetUserHandler,
    private readonly listReminderReceiversHandler: ListReminderReceiversHandler,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAll(
    @Query("status") status?: string,
    @Query("role") role?: string,
    @CurrentUser() user?: { isTest: boolean },
  ): Promise<UserResponseDto[]> {
    return this.listUsersHandler.handle({
      status,
      role,
      isTest: user?.isTest ?? false,
    });
  }

  @Get("reminder-receivers")
  @UseGuards(JwtAuthGuard)
  async getReminderReceivers(
    @CurrentUser() user: { isTest: boolean },
  ): Promise<UserResponseDto[]> {
    return this.listReminderReceiversHandler.handle(user.isTest);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  async getById(@Param("id") id: string): Promise<UserResponseDto> {
    return this.getUserHandler.handle(id);
  }
}
