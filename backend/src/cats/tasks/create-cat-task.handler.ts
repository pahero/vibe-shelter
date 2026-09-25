import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";
import { TaskPayload } from "./task.dto";

@Injectable()
export class CreateCatTaskHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(
    catId: string,
    payload: TaskPayload,
    actorUserId: string,
    isTest: boolean,
  ): Promise<{ id: string }> {
    return runInNewTransaction(this.prisma, async (transaction) => {
      const cat = await transaction.cat.findFirst({
        where: { id: catId, isTest },
        select: { id: true },
      });
      if (!cat) throw new NotFoundException("Cat not found");

      const receivers = await transaction.user.findMany({
        where: { id: { in: payload.receiverIds }, isTest, status: "ACTIVE" },
        select: { id: true },
      });
      if (receivers.length !== payload.receiverIds.length) {
        throw new NotFoundException("One or more active notification receivers were not found");
      }

      const task = await transaction.catTask.create({
        data: { catId, comment: payload.comment, dueDate: payload.dueDate },
      });
      await transaction.catTaskReceiver.createMany({
        data: payload.receiverIds.map((userId) => ({ taskId: task.id, userId })),
      });
      await transaction.catTask.update({
        where: { id: task.id },
        data: { concurrencyToken: crypto.randomUUID() },
      });
      await transaction.catAuditEvent.create({
        data: {
          catId,
          actorUserId,
          eventType: CAT_AUDIT_EVENT_TYPES.taskCreated,
          newValue: task.comment,
        },
      });
      return { id: task.id };
    });
  }
}
