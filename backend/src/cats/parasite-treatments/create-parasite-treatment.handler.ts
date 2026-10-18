import { Injectable, NotFoundException } from "@nestjs/common";
import { runInNewTransaction } from "../../database/helpers";
import { PrismaService } from "../../database/prisma.service";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";
import { ParasiteTreatmentPayload } from "./parasite-treatment.dto";

@Injectable()
export class CreateParasiteTreatmentHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(catId: string, payload: ParasiteTreatmentPayload, actorUserId: string, isTest: boolean): Promise<{ id: string }> {
    return runInNewTransaction(this.prisma, async (transaction) => {
      const cat = await transaction.cat.findFirst({ where: { id: catId, isTest, deletedAt: null }, select: { id: true, version: true } });
      if (!cat) throw new NotFoundException("Cat not found");
      const versionUpdated = await transaction.cat.updateMany({ where: { id: cat.id, version: cat.version, deletedAt: null }, data: { version: { increment: 1 } } });
      if (versionUpdated.count !== 1) throw new NotFoundException("Cat not found");
      const treatment = await transaction.parasiteTreatment.create({ data: { catId, ...payload }, select: { id: true } });
      await transaction.auditEvent.create({ data: { catId, parasiteTreatmentId: treatment.id, actorUserId, isTest, eventType: CAT_AUDIT_EVENT_TYPES.parasiteTreatmentCreated } });
      return { id: treatment.id };
    });
  }
}
