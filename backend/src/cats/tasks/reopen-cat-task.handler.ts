import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";

@Injectable()
export class ReopenCatTaskHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(
    taskId: string,
    userId: string,
    isTest: boolean,
  ): Promise<{ id: string }> {
    return runInNewTransaction(this.prisma, async (transaction) => {
      const task = await transaction.catTask.findFirst({
        where: {
          id: taskId,
          deletedAt: null,
          cat: { isTest, deletedAt: null },
        },
        select: { id: true, catId: true, completedAt: true },
      });
      if (!task) throw new NotFoundException("Task not found");
      const receiver = await transaction.catTaskReceiver.findUnique({
        where: { taskId_userId: { taskId, userId } },
        select: { deletedAt: true },
      });
      if (!receiver || receiver.deletedAt !== null)
        throw new NotFoundException("Task receiver not found");
      if (!task.completedAt)
        throw new ConflictException("Task is not completed");
      await transaction.catTask.update({
        where: { id: task.id },
        data: {
          completedAt: null,
          completedByUserId: null,
          notificationSentAt: null,
          concurrencyToken: crypto.randomUUID(),
        },
      });
      await transaction.auditEvent.create({
        data: {
          catId: task.catId,
          taskId: task.id,
          actorUserId: userId,
          eventType: CAT_AUDIT_EVENT_TYPES.taskReopened,
          oldValue: "completed",
          newValue: "not completed",
        },
      });
      return { id: task.id };
    });
  }
}
