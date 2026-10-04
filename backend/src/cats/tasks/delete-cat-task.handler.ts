import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";

@Injectable()
export class DeleteCatTaskHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(
    taskId: string,
    actorUserId: string,
    isTest: boolean,
  ): Promise<void> {
    await runInNewTransaction(this.prisma, async (transaction) => {
      const task = await transaction.catTask.findFirst({
        where: { id: taskId, deletedAt: null, cat: { isTest } },
        select: { id: true, catId: true },
      });
      if (!task) throw new NotFoundException("Task not found");
      const deletedAt = new Date();
      await transaction.catTask.update({
        where: { id: task.id },
        data: {
          deletedAt,
          concurrencyToken: crypto.randomUUID(),
        },
      });
      await transaction.taskNotification.updateMany({
        where: { taskId: task.id, deletedAt: null },
        data: { deletedAt, version: { increment: 1 } },
      });
      await transaction.catTaskReceiver.updateMany({
        where: { taskId: task.id, deletedAt: null },
        data: { deletedAt, version: { increment: 1 } },
      });
      await transaction.auditEvent.create({
        data: {
          catId: task.catId,
          taskId: task.id,
          actorUserId,
          eventType: CAT_AUDIT_EVENT_TYPES.taskDeleted,
        },
      });
    });
  }
}
