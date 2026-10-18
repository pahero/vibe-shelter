import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { runInNewTransaction } from "../../database/helpers";
import { PrismaService } from "../../database/prisma.service";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";
import { VaccinationPayload } from "./vaccination.dto";

@Injectable()
export class UpdateVaccinationHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(id: string, payload: Partial<VaccinationPayload>, actorUserId: string, isTest: boolean): Promise<{ id: string }> {
    return runInNewTransaction(this.prisma, async (transaction) => {
      const current = await transaction.vaccination.findFirst({
        where: { id, deletedAt: null, cat: { isTest, deletedAt: null } },
      });
      if (!current) throw new NotFoundException("Vaccination not found");
      const changes: { eventType: string; oldValue: string; newValue: string }[] = [];
      if (payload.type !== undefined && payload.type !== current.type) changes.push({ eventType: CAT_AUDIT_EVENT_TYPES.vaccinationTypeChanged, oldValue: current.type, newValue: payload.type });
      if (payload.date !== undefined && payload.date.getTime() !== current.date.getTime()) changes.push({ eventType: CAT_AUDIT_EVENT_TYPES.vaccinationDateChanged, oldValue: current.date.toISOString().slice(0, 10), newValue: payload.date.toISOString().slice(0, 10) });
      if (payload.nextDueDate !== undefined && payload.nextDueDate?.getTime() !== current.nextDueDate?.getTime()) changes.push({ eventType: CAT_AUDIT_EVENT_TYPES.vaccinationNextDueDateChanged, oldValue: current.nextDueDate?.toISOString().slice(0, 10) ?? "Not set", newValue: payload.nextDueDate?.toISOString().slice(0, 10) ?? "Not set" });
      if (payload.vaccineName !== undefined && payload.vaccineName !== current.vaccineName) changes.push({ eventType: CAT_AUDIT_EVENT_TYPES.vaccineNameChanged, oldValue: current.vaccineName ?? "Not set", newValue: payload.vaccineName ?? "Not set" });
      await transaction.vaccination.update({
        where: { id },
        data: {
          ...payload,
          updatedByUserId: actorUserId,
          concurrencyToken: randomUUID(),
        },
      });
      if (changes.length) await transaction.auditEvent.createMany({ data: changes.map((change) => ({ catId: current.catId, vaccinationId: id, actorUserId, isTest, ...change })) });
      return { id };
    });
  }
}
