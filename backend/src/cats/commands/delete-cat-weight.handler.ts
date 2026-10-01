import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";
import { validateCatId } from "../cats.handler-utils";

@Injectable()
export class DeleteCatWeightHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(
    catId: string,
    weightId: string,
    actorUserId: string | undefined,
    isTest: boolean,
  ): Promise<void> {
    validateCatId(catId);
    validateCatId(weightId, "Weight ID");
    await runInNewTransaction(this.prisma, async (tx) => {
      const cat = await tx.cat.findFirst({
        where: { id: catId, isTest },
        select: { id: true },
      });
      if (!cat) throw new NotFoundException("Cat not found");
      const weight = await tx.catWeight.findFirst({
        where: { id: weightId, catId },
        select: { id: true },
      });
      if (!weight) throw new NotFoundException("Weight entry not found");
      await tx.catWeight.delete({ where: { id: weightId } });
      if (actorUserId)
        await tx.catAuditEvent.create({
          data: {
            catId,
            actorUserId,
            eventType: CAT_AUDIT_EVENT_TYPES.weightDeleted,
          },
        });
    });
  }
}
