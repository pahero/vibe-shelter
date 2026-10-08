import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { runInNewTransaction } from "../../database/helpers";
import { PrismaService } from "../../database/prisma.service";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";

@Injectable()
export class RestoreCatTreatmentHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(
    treatmentId: string,
    actorUserId: string,
    isTest: boolean,
  ): Promise<{ id: string }> {
    return runInNewTransaction(this.prisma, async (transaction) => {
      const treatment = await transaction.catTreatment.findFirst({
        where: { id: treatmentId, cat: { isTest } },
        select: { id: true, catId: true, deletedAt: true, shortName: true, startDate: true },
      });
      if (!treatment)
        throw new NotFoundException("Deleted treatment not found");
      if (!treatment.deletedAt)
        throw new ConflictException(
          "Treatment is not deleted and cannot be restored",
        );
      const activeDuplicate = await transaction.catTreatment.findFirst({
        where: {
          catId: treatment.catId,
          shortName: treatment.shortName,
          startDate: treatment.startDate,
          deletedAt: null,
          id: { not: treatment.id },
        },
        select: { id: true },
      });
      if (activeDuplicate)
        throw new ConflictException("An active treatment with this name and start date already exists for this cat");
      await transaction.catTreatment.update({
        where: { id: treatment.id },
        data: { deletedAt: null, concurrencyToken: crypto.randomUUID() },
      });
      await transaction.auditEvent.create({
        data: {
          catId: treatment.catId,
          treatmentId: treatment.id,
          actorUserId,
          eventType: CAT_AUDIT_EVENT_TYPES.treatmentRestored,
        },
      });
      return { id: treatment.id };
    });
  }
}
