import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";

@Injectable()
export class DeleteCatTaskHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(taskId: string, actorUserId: string, isTest: boolean): Promise<void> {
    await runInNewTransaction(this.prisma, async (transaction) => {
      const task = await transaction.catTask.findFirst({
        where: { id: taskId, deletedAt: null, cat: { isTest } },
        select: { id: true, catId: true, comment: true },
      });
      if (!task) throw new NotFoundException("Task not found");
      await transaction.catTask.update({
        where: { id: task.id },
        data: { deletedAt: new Date(), concurrencyToken: crypto.randomUUID() },
      });
      await transaction.catAuditEvent.create({
        data: {
          catId: task.catId,
          actorUserId,
          eventType: CAT_AUDIT_EVENT_TYPES.taskDeleted,
          oldValue: task.comment,
        },
      });
    });
  }
}
