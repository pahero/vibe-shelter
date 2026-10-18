import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class ListCurrentUserNotificationsQuery {
  constructor(private readonly prisma: PrismaService) {}

  async handle(userId: string, isTest: boolean, skip: number, limit: number) {
    const where = {
      userId,
      deletedAt: null,
      OR: [
        { task: { deletedAt: null, cat: { isTest } } },
        { treatment: { deletedAt: null, cat: { isTest } } },
      ],
    };
    const [notifications, total] = await Promise.all([
      this.prisma.taskNotification.findMany({
        where,
        select: {
          id: true,
          createdAt: true,
          task: {
            select: { id: true, catId: true, comment: true, dueDate: true },
          },
          treatment: {
            select: {
              id: true,
              catId: true,
              shortName: true,
              startDate: true,
              cat: { select: { name: true, nameNumber: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.taskNotification.count({ where }),
    ]);
    return {
      data: notifications.map((notification) => notification.task
        ? {
            id: notification.id,
            type: "task" as const,
            taskId: notification.task.id,
            catId: notification.task.catId,
            comment: notification.task.comment,
            dueDate: notification.task.dueDate.toISOString(),
            createdAt: notification.createdAt.toISOString(),
          }
        : {
            id: notification.id,
            type: "treatment" as const,
            treatmentId: notification.treatment!.id,
            catId: notification.treatment!.catId,
            catName: notification.treatment!.cat.name,
            catNameNumber: notification.treatment!.cat.nameNumber,
            comment: notification.treatment!.shortName,
            dueDate: notification.treatment!.startDate.toISOString(),
            createdAt: notification.createdAt.toISOString(),
          }),
      total,
      skip,
      limit,
    };
  }
}
