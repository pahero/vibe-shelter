import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { runInNewTransaction } from "../../database/helpers";
import { PrismaService } from "../../database/prisma.service";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";

@Injectable()
export class DeleteParasiteTreatmentHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(id: string, actorUserId: string, isTest: boolean): Promise<void> {
    await runInNewTransaction(this.prisma, async (transaction) => {
      const treatment = await transaction.parasiteTreatment.findFirst({ where: { id, deletedAt: null, cat: { isTest, deletedAt: null } }, select: { id: true, catId: true } });
      if (!treatment) throw new NotFoundException("Parasite treatment not found");
      await transaction.parasiteTreatment.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedByUserId: actorUserId,
          concurrencyToken: randomUUID(),
        },
      });
      await transaction.auditEvent.create({ data: { catId: treatment.catId, parasiteTreatmentId: id, actorUserId, isTest, eventType: CAT_AUDIT_EVENT_TYPES.parasiteTreatmentDeleted } });
    });
  }
}
