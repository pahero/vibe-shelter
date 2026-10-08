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
          receivers: { select: { userId: true, deletedAt: true } },
        },
      });
      if (!task) throw new NotFoundException("Task not found");
      const dueDateChanged =
        payload.dueDate !== undefined &&
        payload.dueDate.getTime() !== task.dueDate.getTime();
      const currentReceiverIds = task.receivers
        .filter((receiver) => receiver.deletedAt === null)
        .map((receiver) => receiver.userId);
      const requestedReceiverIds = payload.receiverIds;
      const receiversChanged =
        requestedReceiverIds !== undefined &&
        (new Set(currentReceiverIds).size !== new Set(requestedReceiverIds).size ||
          currentReceiverIds.some((userId) => !requestedReceiverIds.includes(userId)));

      if (receiversChanged && requestedReceiverIds) {
        const receivers = await transaction.user.findMany({
          where: { id: { in: requestedReceiverIds }, isTest, status: "ACTIVE" },
          select: { id: true },
        });
        if (receivers.length !== requestedReceiverIds.length) {
          throw new NotFoundException(
            "One or more active notification receivers were not found",
          );
        }
      }

      if (receiversChanged && requestedReceiverIds !== undefined) {
        const requestedReceiverIdSet = new Set(requestedReceiverIds);
        const allReceiverIds = new Set(
          task.receivers.map((receiver) => receiver.userId),
        );
        const deletedAt = new Date();
        const removedReceiverIds = currentReceiverIds.filter(
          (userId) => !requestedReceiverIdSet.has(userId),
        );
        if (removedReceiverIds.length > 0) {
          await transaction.catTaskReceiver.updateMany({
            where: {
              taskId: task.id,
              userId: { in: removedReceiverIds },
              deletedAt: null,
            },
            data: { deletedAt, version: { increment: 1 } },
          });
        }
        const restoredReceiverIds = requestedReceiverIds.filter((userId) =>
          task.receivers.some(
            (receiver) => receiver.userId === userId && receiver.deletedAt,
          ),
        );
        if (restoredReceiverIds.length > 0) {
          await transaction.catTaskReceiver.updateMany({
            where: {
              taskId: task.id,
              userId: { in: restoredReceiverIds },
              deletedAt: { not: null },
            },
            data: { deletedAt: null, version: { increment: 1 } },
          });
        }
        const newReceiverIds = requestedReceiverIds.filter(
          (userId) => !allReceiverIds.has(userId),
        );
        if (newReceiverIds.length > 0) {
          await transaction.catTaskReceiver.createMany({
            data: newReceiverIds.map((userId) => ({
              taskId: task.id,
              userId,
            })),
          });
        }
      }

      const notificationDeletedAt = new Date();
      if (receiversChanged || dueDateChanged) {
        await transaction.taskNotification.updateMany({
          where: {
            taskId: task.id,
            deletedAt: null,
            ...(receiversChanged && requestedReceiverIds !== undefined && !dueDateChanged
              ? { userId: { notIn: requestedReceiverIds } }
              : {}),
          },
          data: {
            deletedAt: notificationDeletedAt,
            version: { increment: 1 },
          },
        });
      }

      await transaction.catTask.update({
        where: { id: task.id },
        data: {
          comment: payload.comment,
          dueDate: payload.dueDate,
          ...(receiversChanged
            ? {
                concurrencyToken: crypto.randomUUID(),
                notificationSentAt: null,
              }
            : dueDateChanged
              ? { notificationSentAt: null }
              : {}),
        },
      });
      if (payload.comment !== undefined && payload.comment !== task.comment) {
        await transaction.auditEvent.create({
          data: {
            catId: task.catId,
            taskId: task.id,
            actorUserId,
            eventType: CAT_AUDIT_EVENT_TYPES.taskCommentChanged,
            oldValue: task.comment,
            newValue: payload.comment,
          },
        });
      }
      if (payload.dueDate !== undefined && dueDateChanged) {
        await transaction.auditEvent.create({
          data: {
            catId: task.catId,
            taskId: task.id,
            actorUserId,
            eventType: CAT_AUDIT_EVENT_TYPES.taskDueDateChanged,
            oldValue: task.dueDate.toISOString(),
            newValue: payload.dueDate.toISOString(),
          },
        });
      }
       if (receiversChanged && requestedReceiverIds !== undefined) {
        await transaction.auditEvent.create({
          data: {
            catId: task.catId,
            taskId: task.id,
            actorUserId,
            eventType: CAT_AUDIT_EVENT_TYPES.taskReceiversChanged,
            oldValue: [...currentReceiverIds].sort().join(", "),
            newValue: [...requestedReceiverIds].sort().join(", "),
          },
        });
      }
      return { id: task.id };
    });
  }
}

