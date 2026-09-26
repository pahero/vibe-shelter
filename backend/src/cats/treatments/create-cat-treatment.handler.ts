import { Injectable, NotFoundException } from "@nestjs/common";
import { runInNewTransaction } from "../../database/helpers";
import { PrismaService } from "../../database/prisma.service";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";
import { TreatmentPayload } from "./treatment.dto";

@Injectable()
export class CreateCatTreatmentHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(catId: string, payload: TreatmentPayload, actorUserId: string, isTest: boolean): Promise<{ id: string }> {
    return runInNewTransaction(this.prisma, async (transaction) => {
      const cat = await transaction.cat.findFirst({ where: { id: catId, isTest }, select: { id: true } });
      if (!cat) throw new NotFoundException("Cat not found");
      const treatment = await transaction.catTreatment.create({ data: { catId, ...payload } });
      await transaction.catAuditEvent.create({
        data: { catId, actorUserId, eventType: CAT_AUDIT_EVENT_TYPES.treatmentCreated },
      });
      return { id: treatment.id };
    });
  }
}
