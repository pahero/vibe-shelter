import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
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
      const duplicate = await transaction.catMedicalNote.findFirst({
        where: { catId, date: payload.date, createdByUserId: actorUserId },
        select: { id: true, deletedAt: true, comment: true },
      });
      if (duplicate && duplicate.deletedAt === null)
        throw new ConflictException("You already have a medical note for this cat on that date");
      if (duplicate) {
        await transaction.catMedicalNote.update({
          where: { id: duplicate.id },
          data: {
            deletedAt: null,
            comment: payload.comment,
            concurrencyToken: crypto.randomUUID(),
          },
        });
        const events = [
          {
            catId,
            medicalNoteId: duplicate.id,
            actorUserId,
            eventType: CAT_AUDIT_EVENT_TYPES.medicalNoteRestored,
          },
          ...(duplicate.comment !== payload.comment
            ? [{
                catId,
                medicalNoteId: duplicate.id,
                actorUserId,
                eventType: CAT_AUDIT_EVENT_TYPES.medicalNoteCommentChanged,
                oldValue: duplicate.comment,
                newValue: payload.comment,
              }]
            : []),
        ];
        await transaction.auditEvent.createMany({ data: events });
        return { id: duplicate.id };
      }
      const note = await transaction.catMedicalNote.create({
        data: { catId, createdByUserId: actorUserId, ...payload },
      });
      await transaction.auditEvent.create({
        data: {
          catId,
          medicalNoteId: note.id,
          actorUserId,
          eventType: CAT_AUDIT_EVENT_TYPES.medicalNoteCreated,
        },
      });
      return { id: note.id };
    });
  }
}
