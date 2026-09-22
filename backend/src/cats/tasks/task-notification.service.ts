import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

/** Persists one notification per receiver only once a task becomes overdue. */
@Injectable()
export class TaskNotificationService implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | undefined;
  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    void this.createDueNotifications();
    this.timer = setInterval(() => void this.createDueNotifications(), 60_000);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async createDueNotifications(now = new Date()): Promise<void> {
    const tasks = await this.prisma.catTask.findMany({
      where: { dueDate: { lte: now }, completedAt: null, deletedAt: null },
      select: { id: true, concurrencyToken: true, receivers: { select: { userId: true } } },
    });
    await this.prisma.$transaction(async (tx) => {
      for (const task of tasks) {
        let concurrencyToken = task.concurrencyToken;
        for (const receiver of task.receivers) {
          await tx.taskNotification.upsert({
            where: { taskId_userId: { taskId: task.id, userId: receiver.userId } },
            create: { taskId: task.id, userId: receiver.userId },
            update: {},
          });
          const nextConcurrencyToken = crypto.randomUUID();
          const updated = await tx.catTask.updateMany({
            where: { id: task.id, deletedAt: null, concurrencyToken },
            data: { concurrencyToken: nextConcurrencyToken },
          });
          if (updated.count !== 1)
            throw new Error("Task was removed while creating a notification");
          concurrencyToken = nextConcurrencyToken;
        }
      }
    });
  }
}
