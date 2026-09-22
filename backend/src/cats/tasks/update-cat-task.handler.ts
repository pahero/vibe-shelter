import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";
import { TaskPayload } from "./task.dto";

@Injectable()
export class UpdateCatTaskHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(
    taskId: string,
    payload: Partial<TaskPayload>,
    actorUserId: string,
    isTest: boolean,
  ): Promise<{ id: string }> {
    return runInNewTransaction(this.prisma, async (transaction) => {
      const task = await transaction.catTask.findFirst({
        where: { id: taskId, deletedAt: null, cat: { isTest } },
        select: {
          id: true,
          catId: true,
          comment: true,
          dueDate: true,
          receivers: { select: { userId: true } },
        },
      });
      if (!task) throw new NotFoundException("Task not found");

      if (payload.receiverIds) {
        const receivers = await transaction.user.findMany({
          where: { id: { in: payload.receiverIds }, isTest, status: "ACTIVE" },
          select: { id: true },
        });
        if (receivers.length !== payload.receiverIds.length) {
          throw new NotFoundException("One or more active notification receivers were not found");
        }
      }

      await transaction.catTask.update({
        where: { id: task.id },
        data: {
          comment: payload.comment,
          dueDate: payload.dueDate,
          ...(payload.receiverIds
            ? {
                concurrencyToken: crypto.randomUUID(),
                receivers: {
                  deleteMany: {},
                  createMany: { data: payload.receiverIds.map((userId) => ({ userId })) },
                },
                notifications: { deleteMany: {} },
              }
            : {}),
        },
      });
      if (payload.comment !== undefined && payload.comment !== task.comment) {
        await transaction.catAuditEvent.create({
          data: {
            catId: task.catId,
            actorUserId,
            eventType: CAT_AUDIT_EVENT_TYPES.taskCommentChanged,
            oldValue: task.comment,
            newValue: payload.comment,
          },
        });
      }
      if (payload.dueDate !== undefined && payload.dueDate.getTime() !== task.dueDate.getTime()) {
        await transaction.catAuditEvent.create({
          data: {
            catId: task.catId,
            actorUserId,
            eventType: CAT_AUDIT_EVENT_TYPES.taskDueDateChanged,
            oldValue: task.dueDate.toISOString(),
            newValue: payload.dueDate.toISOString(),
          },
        });
      }
      if (payload.receiverIds !== undefined) {
        await transaction.catAuditEvent.create({
          data: {
            catId: task.catId,
            actorUserId,
            eventType: CAT_AUDIT_EVENT_TYPES.taskReceiversChanged,
            oldValue: task.receivers.map((receiver) => receiver.userId).join(", "),
            newValue: payload.receiverIds.join(", "),
          },
        });
      }
      return { id: task.id };
    });
  }
}
