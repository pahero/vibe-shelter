import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { SendDueTaskNotificationsHandler } from "./send-due-task-notifications.handler";
import { SendDueTreatmentNotificationsHandler } from "../treatments/send-due-treatment-notifications.handler";

@Injectable()
export class TaskNotificationCronService {
  constructor(
    private readonly sendDueTaskNotificationsHandler: SendDueTaskNotificationsHandler,
    private readonly sendDueTreatmentNotificationsHandler: SendDueTreatmentNotificationsHandler,
  ) {}

  @Cron(CronExpression.EVERY_SECOND)
  async sendOverdueTaskNotifications(): Promise<void> {
    await this.sendDueTaskNotificationsHandler.handle();
    await this.sendDueTreatmentNotificationsHandler.handle();
  }
}
