import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

export type CatTaskResponse = {
  id: string;
  catId: string;
  comment: string;
  dueDate: string;
  receiverIds: string[];
  completedAt: string | null;
  completedBy: { id: string; fullName: string | null } | null;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class ListCatTasksHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(catId: string, isTest: boolean): Promise<CatTaskResponse[]> {
    const cat = await this.prisma.cat.findFirst({
      where: { id: catId, isTest },
      select: { id: true },
    });
    if (!cat) throw new NotFoundException("Cat not found");

    const tasks = await this.prisma.catTask.findMany({
      where: { catId, deletedAt: null },
      include: {
        receivers: { select: { userId: true } },
        completedByUser: { select: { id: true, fullName: true } },
      },
      orderBy: [{ completedAt: "asc" }, { dueDate: "asc" }],
    });
    return tasks.map((task) => ({
      id: task.id,
      catId: task.catId,
      comment: task.comment,
      dueDate: task.dueDate.toISOString(),
      receiverIds: task.receivers.map((receiver) => receiver.userId),
      completedAt: task.completedAt?.toISOString() ?? null,
      completedBy: task.completedByUser,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    }));
  }
}
