import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";

@Injectable()
export class DeleteArchivationReasonCommand {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    id: string,
    actorUserId: string,
    replacementReasonId?: string,
    isTest = false,
  ): Promise<void> {
    await runInNewTransaction(this.prisma, async (transaction) => {
      const existing = await transaction.catArchivationReason.findFirst({
        where: { id, isTest, deletedAt: null },
        select: { id: true },
      });
      if (!existing)
        throw new NotFoundException("Archivation reason not found");
      const used = await transaction.cat.count({
        where: { archivationReasonId: id, isTest },
      });
      if (used > 0 && !replacementReasonId)
        throw new ConflictException(
          "Choose a replacement archivation reason for assigned cats",
        );
      if (replacementReasonId === id)
        throw new BadRequestException(
          "Replacement archivation reason must be different",
        );
      const replacement = replacementReasonId
        ? await transaction.catArchivationReason.findFirst({
            where: { id: replacementReasonId, isTest, deletedAt: null },
          })
        : null;
      if (replacementReasonId && !replacement)
        throw new NotFoundException("Replacement archivation reason not found");
      if (replacement) {
        await transaction.cat.updateMany({
          where: { archivationReasonId: id, isTest },
          data: { archivationReasonId: replacement.id },
        });
      }
      await transaction.catAuditEvent.create({
        data: {
          archivationReasonId: id,
          actorUserId,
          eventType: CAT_AUDIT_EVENT_TYPES.archivationReasonDelete,
        },
      });
      await transaction.catArchivationReason.update({
        where: { id },
        data: { deletedAt: new Date(), version: { increment: 1 } },
      });
    });
  }
}
