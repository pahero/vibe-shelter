import { Injectable, NotFoundException } from "@nestjs/common";
import { runInNewTransaction } from "../../database/helpers";
import { PrismaService } from "../../database/prisma.service";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";

@Injectable()
export class DeleteCatTreatmentHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(treatmentId: string, actorUserId: string, isTest: boolean): Promise<void> {
    await runInNewTransaction(this.prisma, async (transaction) => {
      const treatment = await transaction.catTreatment.findFirst({
        where: { id: treatmentId, deletedAt: null, cat: { isTest } },
        select: { id: true, catId: true, shortName: true },
      });
      if (!treatment) throw new NotFoundException("Treatment not found");
      await transaction.catTreatment.update({
        where: { id: treatment.id },
        data: { deletedAt: new Date(), concurrencyToken: crypto.randomUUID() },
      });
      await transaction.catAuditEvent.create({
        data: {
          catId: treatment.catId,
          actorUserId,
          eventType: CAT_AUDIT_EVENT_TYPES.treatmentDeleted,
          oldValue: treatment.shortName,
        },
      });
    });
  }
}
