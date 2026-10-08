import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { runInNewTransaction } from "../../database/helpers";
import { PrismaService } from "../../database/prisma.service";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";
import { TreatmentPayload } from "./treatment.dto";

@Injectable()
export class CreateCatTreatmentHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(
    catId: string,
    payload: TreatmentPayload,
    actorUserId: string,
    isTest: boolean,
  ): Promise<{ id: string }> {
    return runInNewTransaction(this.prisma, async (transaction) => {
      const cat = await transaction.cat.findFirst({
        where: { id: catId, isTest },
        select: { id: true },
      });
      if (!cat) throw new NotFoundException("Cat not found");
      const duplicate = await transaction.catTreatment.findFirst({
        where: { catId, shortName: payload.shortName, startDate: payload.startDate },
        select: {
          id: true,
          deletedAt: true,
          shortName: true,
          instructions: true,
          startDate: true,
          endDate: true,
          dosesPerDay: true,
        },
      });
      if (duplicate && duplicate.deletedAt === null)
        throw new ConflictException("An active treatment with this name and start date already exists for this cat");
      if (duplicate) {
        await transaction.catTreatment.update({
          where: { id: duplicate.id },
          data: { ...payload, deletedAt: null, concurrencyToken: crypto.randomUUID() },
        });
        const changes: {
          eventType: (typeof CAT_AUDIT_EVENT_TYPES)[keyof typeof CAT_AUDIT_EVENT_TYPES];
          oldValue: string;
          newValue: string;
        }[] = [];
        if (payload.instructions !== duplicate.instructions)
          changes.push({ eventType: CAT_AUDIT_EVENT_TYPES.treatmentInstructionsChanged, oldValue: duplicate.instructions ?? "none", newValue: payload.instructions ?? "none" });
        if (payload.endDate?.getTime() !== duplicate.endDate?.getTime())
          changes.push({ eventType: CAT_AUDIT_EVENT_TYPES.treatmentEndDateChanged, oldValue: duplicate.endDate?.toISOString().slice(0, 10) ?? "none", newValue: payload.endDate?.toISOString().slice(0, 10) ?? "none" });
        if (payload.dosesPerDay !== duplicate.dosesPerDay)
          changes.push({ eventType: CAT_AUDIT_EVENT_TYPES.treatmentDosesPerDayChanged, oldValue: String(duplicate.dosesPerDay), newValue: String(payload.dosesPerDay) });
        await transaction.auditEvent.createMany({
          data: [
            { catId, treatmentId: duplicate.id, actorUserId, eventType: CAT_AUDIT_EVENT_TYPES.treatmentRestored },
            ...changes.map((change) => ({ catId, treatmentId: duplicate.id, actorUserId, ...change })),
          ],
        });
        return { id: duplicate.id };
      }
      const treatment = await transaction.catTreatment.create({
        data: { catId, ...payload },
      });
      await transaction.auditEvent.create({
        data: {
          catId,
          treatmentId: treatment.id,
          actorUserId,
          eventType: CAT_AUDIT_EVENT_TYPES.treatmentCreated,
        },
      });
      return { id: treatment.id };
    });
  }
}
