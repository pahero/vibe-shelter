import { Injectable, NotFoundException } from "@nestjs/common";
import { runInNewTransaction } from "../../database/helpers";
import { PrismaService } from "../../database/prisma.service";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";
import { MedicalNotePayload } from "./medical-note.dto";
@Injectable()
export class CreateCatMedicalNoteHandler {
  constructor(private readonly prisma: PrismaService) {}
  async handle(
    catId: string,
    payload: MedicalNotePayload,
    actorUserId: string,
    isTest: boolean,
  ): Promise<{ id: string }> {
    return runInNewTransaction(this.prisma, async (transaction) => {
      const cat = await transaction.cat.findFirst({
        where: { id: catId, isTest },
        select: { id: true },
      });
      if (!cat) throw new NotFoundException("Cat not found");
      const note = await transaction.catMedicalNote.create({
        data: { catId, ...payload },
      });
      await transaction.auditEvent.create({
        data: {
          catId,
          actorUserId,
          eventType: CAT_AUDIT_EVENT_TYPES.medicalNoteCreated,
        },
      });
      return { id: note.id };
    });
  }
}
