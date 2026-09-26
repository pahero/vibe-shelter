import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { runInNewTransaction } from "../../database/helpers";
import { PrismaService } from "../../database/prisma.service";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";
import { TreatmentPayload } from "./treatment.dto";

@Injectable()
export class UpdateCatTreatmentHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(treatmentId: string, payload: Partial<TreatmentPayload>, actorUserId: string, isTest: boolean): Promise<{ id: string }> {
    return runInNewTransaction(this.prisma, async (transaction) => {
      const treatment = await transaction.catTreatment.findFirst({ where: { id: treatmentId, cat: { isTest } } });
      if (!treatment) throw new NotFoundException("Treatment not found");
      const startDate = payload.startDate ?? treatment.startDate;
      const endDate = payload.endDate === undefined ? treatment.endDate : payload.endDate;
      if (endDate && endDate < startDate) throw new BadRequestException("endDate cannot be before startDate");
      if (payload.startDate !== undefined || payload.endDate !== undefined) {
        const administrationOutsidePeriod = await transaction.catTreatmentAdministration.findFirst({
          where: {
            treatmentId,
            OR: [
              { administeredOn: { lt: startDate } },
              ...(endDate ? [{ administeredOn: { gt: endDate } }] : []),
            ],
          },
          select: { treatmentId: true },
        });
        if (administrationOutsidePeriod) {
          throw new BadRequestException("Cannot change the period to exclude recorded administrations");
        }
      }
      if (payload.dosesPerDay !== undefined && payload.dosesPerDay < treatment.dosesPerDay) {
        const higherDoseExists = await transaction.catTreatmentAdministration.findFirst({
          where: { treatmentId, doseNumber: { gt: payload.dosesPerDay } }, select: { treatmentId: true },
        });
        if (higherDoseExists) throw new BadRequestException("Cannot reduce dosesPerDay after recording the later dose");
      }
      await transaction.catTreatment.update({ where: { id: treatmentId }, data: payload });
      const changes: { eventType: (typeof CAT_AUDIT_EVENT_TYPES)[keyof typeof CAT_AUDIT_EVENT_TYPES]; oldValue: string; newValue: string }[] = [];
      if (payload.shortName !== undefined && payload.shortName !== treatment.shortName) changes.push({ eventType: CAT_AUDIT_EVENT_TYPES.treatmentShortNameChanged, oldValue: treatment.shortName, newValue: payload.shortName });
      if (payload.instructions !== undefined && payload.instructions !== treatment.instructions) changes.push({ eventType: CAT_AUDIT_EVENT_TYPES.treatmentInstructionsChanged, oldValue: treatment.instructions, newValue: payload.instructions });
      if (payload.startDate && payload.startDate.getTime() !== treatment.startDate.getTime()) changes.push({ eventType: CAT_AUDIT_EVENT_TYPES.treatmentStartDateChanged, oldValue: treatment.startDate.toISOString().slice(0, 10), newValue: payload.startDate.toISOString().slice(0, 10) });
      if (payload.endDate !== undefined && payload.endDate?.getTime() !== treatment.endDate?.getTime()) changes.push({ eventType: CAT_AUDIT_EVENT_TYPES.treatmentEndDateChanged, oldValue: treatment.endDate?.toISOString().slice(0, 10) ?? "none", newValue: payload.endDate?.toISOString().slice(0, 10) ?? "none" });
      if (payload.dosesPerDay !== undefined && payload.dosesPerDay !== treatment.dosesPerDay) changes.push({ eventType: CAT_AUDIT_EVENT_TYPES.treatmentDosesPerDayChanged, oldValue: String(treatment.dosesPerDay), newValue: String(payload.dosesPerDay) });
      if (changes.length) await transaction.catAuditEvent.createMany({ data: changes.map((change) => ({ catId: treatment.catId, actorUserId, ...change })) });
      return { id: treatmentId };
    });
  }
}
