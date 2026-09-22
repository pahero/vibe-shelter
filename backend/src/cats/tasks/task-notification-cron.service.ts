import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { SendDueTaskNotificationsHandler } from "./send-due-task-notifications.handler";

@Injectable()
export class TaskNotificationCronService {
  constructor(private readonly sendDueTaskNotificationsHandler: SendDueTaskNotificationsHandler) {}

  @Cron(CronExpression.EVERY_SECOND)
  async sendOverdueTaskNotifications(): Promise<void> {
    await this.sendDueTaskNotificationsHandler.handle();
  }
}
