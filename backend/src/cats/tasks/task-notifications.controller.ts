import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { CurrentUser, SessionAuthGuard } from "../../auth";
import { ListCurrentUserNotificationsDto } from "./list-current-user-notifications.dto";
import { ListCurrentUserNotificationsQuery } from "./list-current-user-notifications.query";

@Controller("api/notifications")
@UseGuards(SessionAuthGuard)
export class TaskNotificationsController {
  constructor(
    private readonly listCurrentUserNotificationsQuery: ListCurrentUserNotificationsQuery,
  ) {}

  @Get()
  async list(
    @Query() dto: ListCurrentUserNotificationsDto,
    @CurrentUser() user: { id: string; isTest: boolean },
  ) {
    const query = dto.toQuery(user.id, user.isTest);
    return this.listCurrentUserNotificationsQuery.handle(
      query.userId,
      query.isTest,
      query.skip,
      query.limit,
    );
  }
}
