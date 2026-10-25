import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";
import { PushNotificationService } from "./push-notification.service";

@Injectable()
export class SendDueTaskNotificationsHandler {
  constructor(private readonly prisma: PrismaService, private readonly push: PushNotificationService) {}

  async handle(now = new Date()): Promise<void> {
    const tasks = await this.prisma.catTask.findMany({
      where: {
        dueDate: { lte: now },
        completedAt: null,
        deletedAt: null,
        notificationSentAt: null,
      },
      select: {
        id: true,
        concurrencyToken: true,
        receivers: { where: { deletedAt: null }, select: { userId: true } },
      },
      take: 50,
    });

    const recipients = new Set<string>();
    await runInNewTransaction(this.prisma, async (transaction) => {
      for (const task of tasks) {
        for (const receiver of task.receivers) {
          recipients.add(receiver.userId);
          await transaction.taskNotification.upsert({
            where: {
              taskId_userId: { taskId: task.id, userId: receiver.userId },
            },
            create: { taskId: task.id, userId: receiver.userId },
            update: { deletedAt: null, version: { increment: 1 } },
          });
        }
        const updated = await transaction.catTask.updateMany({
          where: {
            id: task.id,
            deletedAt: null,
            notificationSentAt: null,
            concurrencyToken: task.concurrencyToken,
          },
          data: {
            notificationSentAt: now,
            concurrencyToken: crypto.randomUUID(),
          },
        });
        if (updated.count !== 1)
          throw new Error("Task was removed while sending notifications");
      }
    });
    await Promise.all([...recipients].map((userId) => this.push.sendToUser(userId, {
      title: "Shelter task due",
      body: "You have a task that is due.",
      url: "/#notifications",
    })));
  }
}
