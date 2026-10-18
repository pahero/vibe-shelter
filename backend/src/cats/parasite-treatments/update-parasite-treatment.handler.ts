import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { runInNewTransaction } from "../../database/helpers";
import { PrismaService } from "../../database/prisma.service";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";
import { ParasiteTreatmentPayload } from "./parasite-treatment.dto";

@Injectable()
export class UpdateParasiteTreatmentHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(id: string, payload: Partial<ParasiteTreatmentPayload>, actorUserId: string, isTest: boolean): Promise<{ id: string }> {
    return runInNewTransaction(this.prisma, async (transaction) => {
      const current = await transaction.parasiteTreatment.findFirst({ where: { id, deletedAt: null, cat: { isTest, deletedAt: null } } });
      if (!current) throw new NotFoundException("Parasite treatment not found");
      const changes: { eventType: string; oldValue: string; newValue: string }[] = [];
      if (payload.type !== undefined && payload.type !== current.type) changes.push({ eventType: CAT_AUDIT_EVENT_TYPES.parasiteTreatmentTypeChanged, oldValue: current.type, newValue: payload.type });
      if (payload.date !== undefined && payload.date.getTime() !== current.date.getTime()) changes.push({ eventType: CAT_AUDIT_EVENT_TYPES.parasiteTreatmentDateChanged, oldValue: current.date.toISOString().slice(0, 10), newValue: payload.date.toISOString().slice(0, 10) });
      if (payload.nextDueDate !== undefined && payload.nextDueDate?.getTime() !== current.nextDueDate?.getTime()) changes.push({ eventType: CAT_AUDIT_EVENT_TYPES.parasiteTreatmentNextDueDateChanged, oldValue: current.nextDueDate?.toISOString().slice(0, 10) ?? "Not set", newValue: payload.nextDueDate?.toISOString().slice(0, 10) ?? "Not set" });
      if (payload.productName !== undefined && payload.productName !== current.productName) changes.push({ eventType: CAT_AUDIT_EVENT_TYPES.productNameChanged, oldValue: current.productName, newValue: payload.productName });
      await transaction.parasiteTreatment.update({
        where: { id },
        data: {
          ...payload,
          updatedByUserId: actorUserId,
          concurrencyToken: randomUUID(),
        },
      });
      if (changes.length) await transaction.auditEvent.createMany({ data: changes.map((change) => ({ catId: current.catId, parasiteTreatmentId: id, actorUserId, isTest, ...change })) });
      return { id };
    });
  }
}
