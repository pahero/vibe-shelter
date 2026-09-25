import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";

@Injectable()
export class SendDueTaskNotificationsHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(now = new Date()): Promise<void> {
    const tasks = await this.prisma.catTask.findMany({
      where: {
        dueDate: { lte: now },
        completedAt: null,
        deletedAt: null,
        notificationSentAt: null,
      },
      select: { id: true, concurrencyToken: true, receivers: { select: { userId: true } } },
      take: 50,
    });

    await runInNewTransaction(this.prisma, async (transaction) => {
      for (const task of tasks) {
        for (const receiver of task.receivers) {
          await transaction.taskNotification.upsert({
            where: { taskId_userId: { taskId: task.id, userId: receiver.userId } },
            create: { taskId: task.id, userId: receiver.userId },
            update: {},
          });
        }
        const updated = await transaction.catTask.updateMany({
          where: {
            id: task.id,
            deletedAt: null,
            notificationSentAt: null,
            concurrencyToken: task.concurrencyToken,
          },
          data: { notificationSentAt: now, concurrencyToken: crypto.randomUUID() },
        });
        if (updated.count !== 1) throw new Error("Task was removed while sending notifications");
      }
    });
  }
}
