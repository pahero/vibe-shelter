import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { UserResponseDto } from "@/auth/dto";
import { CurrentUser, SessionAuthGuard } from "@/auth";
import { ListUsersHandler } from "./queries/list-users.handler";
import { GetUserHandler } from "./queries/get-user.handler";

@Controller("users")
export class UsersController {
  constructor(
    private readonly listUsersHandler: ListUsersHandler,
    private readonly getUserHandler: GetUserHandler,
  ) {}

  @Get()
  @UseGuards(SessionAuthGuard)
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

  @Get(":id")
  @UseGuards(SessionAuthGuard)
  async getById(@Param("id") id: string): Promise<UserResponseDto> {
    return this.getUserHandler.handle(id);
  }
}
