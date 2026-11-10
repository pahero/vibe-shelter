import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class ListMyTasksHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(userId: string, isTest: boolean) {
    const tasks = await this.prisma.catTask.findMany({
      where: {
        deletedAt: null,
        receivers: { some: { userId, deletedAt: null } },
        cat: { isTest, deletedAt: null },
      },
      select: {
        id: true,
        catId: true,
        comment: true,
        dueDate: true,
        completedAt: true,
        completedByUser: { select: { id: true, fullName: true } },
        createdAt: true,
        updatedAt: true,
        receivers: { where: { deletedAt: null }, select: { userId: true } },
        cat: { select: { id: true, name: true, nameNumber: true } },
      },
      orderBy: [{ dueDate: "asc" }, { id: "asc" }],
    });
    return tasks.map(({ receivers, completedByUser, ...task }) => ({
      ...task,
      receiverIds: receivers.map((receiver) => receiver.userId),
      completedBy: completedByUser,
    }));
  }
}
