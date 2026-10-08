import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { runInNewTransaction } from "../../database/helpers";
import { PrismaService } from "../../database/prisma.service";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";
import { NotePayload } from "./note.dto";
@Injectable()
export class CreateCatNoteHandler {
  constructor(private readonly prisma: PrismaService) {}
  async handle(
    catId: string,
    payload: NotePayload,
    actorUserId: string,
    isTest: boolean,
  ): Promise<{ id: string }> {
    return runInNewTransaction(this.prisma, async (transaction) => {
      const cat = await transaction.cat.findFirst({
        where: { id: catId, isTest },
        select: { id: true },
      });
      if (!cat) throw new NotFoundException("Cat not found");
      const duplicate = await transaction.catNote.findFirst({
        where: { catId, date: payload.date, createdByUserId: actorUserId },
        select: { id: true, deletedAt: true, comment: true },
      });
      if (duplicate && duplicate.deletedAt === null)
        throw new ConflictException("You already have a note for this cat on that date");
      if (duplicate) {
        await transaction.catNote.update({
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
            noteId: duplicate.id,
            actorUserId,
            eventType: CAT_AUDIT_EVENT_TYPES.noteRestored,
          },
          ...(duplicate.comment !== payload.comment
            ? [{
                catId,
                noteId: duplicate.id,
                actorUserId,
                eventType: CAT_AUDIT_EVENT_TYPES.noteCommentChanged,
                oldValue: duplicate.comment,
                newValue: payload.comment,
              }]
            : []),
        ];
        await transaction.auditEvent.createMany({ data: events });
        return { id: duplicate.id };
      }
      const note = await transaction.catNote.create({
        data: { catId, createdByUserId: actorUserId, ...payload },
      });
      await transaction.auditEvent.create({
        data: {
          catId,
          noteId: note.id,
          actorUserId,
          eventType: CAT_AUDIT_EVENT_TYPES.noteCreated,
        },
      });
      return { id: note.id };
    });
  }
}
