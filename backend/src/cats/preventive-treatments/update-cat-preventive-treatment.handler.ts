import { Injectable, NotFoundException } from "@nestjs/common";
import { runInNewTransaction } from "../../database/helpers";
import { PrismaService } from "../../database/prisma.service";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";
import { PreventiveTreatmentPayload } from "./preventive-treatment.dto";
@Injectable()
export class UpdateCatPreventiveTreatmentHandler {
  constructor(private readonly prisma: PrismaService) {}
  async handle(
    treatmentId: string,
    payload: Partial<PreventiveTreatmentPayload>,
    actorUserId: string,
    isTest: boolean,
  ): Promise<{ id: string }> {
    return runInNewTransaction(this.prisma, async (transaction) => {
      const treatment = await transaction.catPreventiveTreatment.findFirst({
        where: { id: treatmentId, deletedAt: null, cat: { isTest } },
      });
      if (!treatment)
        throw new NotFoundException("Preventive treatment not found");
      await transaction.catPreventiveTreatment.update({
        where: { id: treatment.id },
        data: { ...payload, concurrencyToken: crypto.randomUUID() },
      });
      const changes: {
        eventType: (typeof CAT_AUDIT_EVENT_TYPES)[keyof typeof CAT_AUDIT_EVENT_TYPES];
        oldValue: string;
        newValue: string;
      }[] = [];
      if (payload.date && payload.date.getTime() !== treatment.date.getTime())
        changes.push({
          eventType: CAT_AUDIT_EVENT_TYPES.preventiveTreatmentDateChanged,
          oldValue: treatment.date.toISOString().slice(0, 10),
          newValue: payload.date.toISOString().slice(0, 10),
        });
      if (payload.name !== undefined && payload.name !== treatment.name)
        changes.push({
          eventType: CAT_AUDIT_EVENT_TYPES.preventiveTreatmentNameChanged,
          oldValue: treatment.name,
          newValue: payload.name,
        });
      if (payload.type !== undefined && payload.type !== treatment.type)
        changes.push({
          eventType: CAT_AUDIT_EVENT_TYPES.preventiveTreatmentTypeChanged,
          oldValue: treatment.type,
          newValue: payload.type,
        });
      if (changes.length)
        await transaction.auditEvent.createMany({
          data: changes.map((change) => ({
            catId: treatment.catId,
            preventiveTreatmentId: treatment.id,
            actorUserId,
            ...change,
          })),
        });
      return { id: treatment.id };
    });
  }
}
