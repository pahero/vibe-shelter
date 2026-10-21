import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";

@Injectable()
export class SetCatFlightCandidateHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(catId: string, isFlightCandidate: boolean, actorUserId: string, isTest: boolean): Promise<{ id: string }> {
    return runInNewTransaction(this.prisma, async (tx) => {
      const cat = await tx.cat.findFirst({
        where: { id: catId, isTest },
        select: { id: true, isFlightCandidate: true },
      });
      if (!cat) throw new NotFoundException("Cat not found");
      if (cat.isFlightCandidate !== isFlightCandidate) {
        await tx.cat.update({ where: { id: catId }, data: { isFlightCandidate } });
        await tx.auditEvent.create({
          data: {
            catId,
            actorUserId,
            isTest,
            eventType: CAT_AUDIT_EVENT_TYPES.flightCandidate,
            oldValue: String(cat.isFlightCandidate),
            newValue: String(isFlightCandidate),
          },
        });
      }
      return { id: catId };
    });
  }
}
