import { Injectable, NotFoundException } from "@nestjs/common";
import { runInNewTransaction } from "../../database/helpers";
import { PrismaService } from "../../database/prisma.service";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";
import { NotePayload } from "./note.dto";
@Injectable()
export class UpdateCatNoteHandler {
  constructor(private readonly prisma: PrismaService) {}
  async handle(
    noteId: string,
    payload: Partial<NotePayload>,
    actorUserId: string,
    isTest: boolean,
  ): Promise<{ id: string }> {
    return runInNewTransaction(this.prisma, async (transaction) => {
      const note = await transaction.catNote.findFirst({
        where: { id: noteId, deletedAt: null, cat: { isTest } },
      });
      if (!note) throw new NotFoundException("Note not found");
      await transaction.catNote.update({
        where: { id: note.id },
        data: { ...payload, concurrencyToken: crypto.randomUUID() },
      });
      const changes: {
        eventType: (typeof CAT_AUDIT_EVENT_TYPES)[keyof typeof CAT_AUDIT_EVENT_TYPES];
        oldValue: string;
        newValue: string;
      }[] = [];
      if (payload.date && payload.date.getTime() !== note.date.getTime())
        changes.push({
          eventType: CAT_AUDIT_EVENT_TYPES.noteDateChanged,
          oldValue: note.date.toISOString().slice(0, 10),
          newValue: payload.date.toISOString().slice(0, 10),
        });
      if (payload.comment !== undefined && payload.comment !== note.comment)
        changes.push({
          eventType: CAT_AUDIT_EVENT_TYPES.noteCommentChanged,
          oldValue: note.comment,
          newValue: payload.comment,
        });
      if (changes.length)
        await transaction.auditEvent.createMany({
          data: changes.map((change) => ({
            catId: note.catId,
            actorUserId,
            ...change,
          })),
        });
      return { id: note.id };
    });
  }
}
