import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import {
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
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
  @ApiBearerAuth()
  @ApiOperation({ summary: "List all users with optional filters" })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ["active", "inactive"],
    description: "Filter by user status",
  })
  @ApiQuery({
    name: "role",
    required: false,
    enum: ["admin", "staff"],
    description: "Filter by user role",
  })
  @ApiResponse({
    status: 200,
    description: "List of users",
    type: [UserResponseDto],
  })
  @ApiResponse({ status: 401, description: "Not authenticated" })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user details by ID" })
  @ApiParam({ name: "id", description: "User ID", example: "uuid-1234" })
  @ApiResponse({
    status: 200,
    description: "User details",
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: "Not authenticated" })
  @ApiResponse({ status: 404, description: "User not found" })
  async getById(@Param("id") id: string): Promise<UserResponseDto> {
    return this.getUserHandler.handle(id);
  }
}
