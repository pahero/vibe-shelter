import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { runInNewTransaction } from "../../database/helpers";
import { PrismaService } from "../../database/prisma.service";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";

@Injectable()
export class SetCatTreatmentAdministrationHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(
    treatmentId: string,
    input: { date: Date; doseNumber: number; checked: boolean },
    actorUserId: string,
    isTest: boolean,
  ): Promise<{ id: string }> {
    return runInNewTransaction(this.prisma, async (transaction) => {
      const treatment = await transaction.catTreatment.findFirst({
        where: { id: treatmentId, deletedAt: null, cat: { isTest } },
        select: {
          id: true,
          catId: true,
          shortName: true,
          startDate: true,
          endDate: true,
          dosesPerDay: true,
        },
      });
      if (!treatment) throw new NotFoundException("Treatment not found");
      if (input.doseNumber > treatment.dosesPerDay)
        throw new BadRequestException(
          "doseNumber is not configured for this treatment",
        );
      if (
        input.date < treatment.startDate ||
        (treatment.endDate && input.date > treatment.endDate)
      )
        throw new BadRequestException("date is outside the treatment period");
      const where = {
        treatmentId_administeredOn_doseNumber: {
          treatmentId,
          administeredOn: input.date,
          doseNumber: input.doseNumber,
        },
      };
      const existing = await transaction.catTreatmentAdministration.findUnique({
        where,
        select: { deletedAt: true },
      });
      const wasChecked = existing !== null && existing.deletedAt === null;
      if (input.checked && !wasChecked) {
        if (existing) {
          await transaction.catTreatmentAdministration.update({
            where,
            data: {
              checkedByUserId: actorUserId,
              deletedAt: null,
              version: { increment: 1 },
            },
          });
        } else {
          await transaction.catTreatmentAdministration.create({
            data: {
              treatmentId,
              administeredOn: input.date,
              doseNumber: input.doseNumber,
              checkedByUserId: actorUserId,
            },
          });
        }
      }
      if (!input.checked && wasChecked)
        await transaction.catTreatmentAdministration.update({
          where,
          data: { deletedAt: new Date(), version: { increment: 1 } },
        });
      if (input.checked !== wasChecked) {
        await transaction.catTreatment.update({
          where: { id: treatment.id },
          data: { concurrencyToken: crypto.randomUUID() },
        });
      }
      if (input.checked !== wasChecked) {
        await transaction.auditEvent.create({
          data: {
            catId: treatment.catId,
            treatmentId: treatment.id,
            treatmentAdministrationDate: input.date,
            actorUserId,
            eventType: input.checked
              ? CAT_AUDIT_EVENT_TYPES.treatmentAdministrationChecked
              : CAT_AUDIT_EVENT_TYPES.treatmentAdministrationUnchecked,
            oldValue: input.checked ? "unchecked" : "checked",
            newValue: input.checked ? "checked" : "unchecked",
          },
        });
      }
      return { id: treatmentId };
    });
  }
}
