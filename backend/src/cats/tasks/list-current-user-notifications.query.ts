import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class ListCurrentUserNotificationsQuery {
  constructor(private readonly prisma: PrismaService) {}

  async handle(userId: string, isTest: boolean, skip: number, limit: number) {
    const where = { userId, task: { cat: { isTest } } };
    const [notifications, total] = await Promise.all([
      this.prisma.taskNotification.findMany({
        where,
        select: {
          id: true,
          createdAt: true,
          task: { select: { id: true, catId: true, comment: true, dueDate: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.taskNotification.count({ where }),
    ]);
    return {
      data: notifications.map((notification) => ({
        id: notification.id,
        taskId: notification.task.id,
        catId: notification.task.catId,
        comment: notification.task.comment,
        dueDate: notification.task.dueDate.toISOString(),
        createdAt: notification.createdAt.toISOString(),
      })),
      total,
      skip,
      limit,
    };
  }
}
