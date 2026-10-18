import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { runInNewTransaction } from "../../database/helpers";
import { PrismaService } from "../../database/prisma.service";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";

@Injectable()
export class DeleteVaccinationHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(id: string, actorUserId: string, isTest: boolean): Promise<void> {
    await runInNewTransaction(this.prisma, async (transaction) => {
      const vaccination = await transaction.vaccination.findFirst({
        where: { id, deletedAt: null, cat: { isTest, deletedAt: null } },
        select: { id: true, catId: true },
      });
      if (!vaccination) throw new NotFoundException("Vaccination not found");
      await transaction.vaccination.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedByUserId: actorUserId,
          concurrencyToken: randomUUID(),
        },
      });
      await transaction.auditEvent.create({
        data: { catId: vaccination.catId, vaccinationId: id, actorUserId, isTest, eventType: CAT_AUDIT_EVENT_TYPES.vaccinationDeleted },
      });
    });
  }
}
