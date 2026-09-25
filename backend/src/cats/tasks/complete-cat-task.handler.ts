import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";

@Injectable()
export class CompleteCatTaskHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(taskId: string, userId: string, isTest: boolean): Promise<{ id: string }> {
    return runInNewTransaction(this.prisma, async (transaction) => {
      const task = await transaction.catTask.findFirst({
        where: { id: taskId, deletedAt: null, cat: { isTest } },
        select: { id: true, catId: true, comment: true, completedAt: true },
      });
      if (!task) throw new NotFoundException("Task not found");
      if (task.completedAt) throw new ConflictException("Task is already completed");

      const receiver = await transaction.catTaskReceiver.findUnique({
        where: { taskId_userId: { taskId, userId } },
        select: { taskId: true },
      });
      if (!receiver) throw new NotFoundException("Task receiver not found");

      await transaction.catTask.update({
        where: { id: task.id },
        data: {
          completedAt: new Date(),
          completedByUserId: userId,
          notifications: { deleteMany: {} },
        },
      });
      await transaction.catAuditEvent.create({
        data: {
          catId: task.catId,
          actorUserId: userId,
          eventType: CAT_AUDIT_EVENT_TYPES.taskCompleted,
          oldValue: task.comment,
          newValue: userId,
        },
      });
      return { id: task.id };
    });
  }
}
