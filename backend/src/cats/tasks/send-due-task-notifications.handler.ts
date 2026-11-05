import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";
import { PushNotificationService } from "./push-notification.service";

@Injectable()
export class SendDueTaskNotificationsHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushNotificationService,
  ) {}

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
        // Another request or scheduler may have changed this task since the
        // initial read. It is no longer eligible for this notification pass.
        if (updated.count !== 1) continue;
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
      }
    });
    await Promise.all(
      [...recipients].map((userId) =>
        this.push.sendToUser(userId, {
          title: "Shelter task due",
          body: "You have a task that is due.",
          url: "/#notifications",
        }),
      ),
    );
  }
}
