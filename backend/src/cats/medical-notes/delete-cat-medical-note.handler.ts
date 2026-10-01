import { Injectable, NotFoundException } from "@nestjs/common";
import { runInNewTransaction } from "../../database/helpers";
import { PrismaService } from "../../database/prisma.service";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";
@Injectable()
export class DeleteCatMedicalNoteHandler {
  constructor(private readonly prisma: PrismaService) {}
  async handle(
    noteId: string,
    actorUserId: string,
    isTest: boolean,
  ): Promise<void> {
    await runInNewTransaction(this.prisma, async (transaction) => {
      const note = await transaction.catMedicalNote.findFirst({
        where: { id: noteId, deletedAt: null, cat: { isTest } },
        select: { id: true, catId: true },
      });
      if (!note) throw new NotFoundException("Medical note not found");
      await transaction.catMedicalNote.update({
        where: { id: note.id },
        data: { deletedAt: new Date(), concurrencyToken: crypto.randomUUID() },
      });
      await transaction.catAuditEvent.create({
        data: {
          catId: note.catId,
          actorUserId,
          eventType: CAT_AUDIT_EVENT_TYPES.medicalNoteDeleted,
        },
      });
    });
  }
}
