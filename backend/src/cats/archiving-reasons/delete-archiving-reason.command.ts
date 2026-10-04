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
export class DeleteArchivingReasonCommand {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    id: string,
    actorUserId: string,
    replacementReasonId?: string,
    isTest = false,
  ): Promise<void> {
    await runInNewTransaction(this.prisma, async (transaction) => {
      const existing = await transaction.catArchivingReason.findFirst({
        where: { id, isTest, deletedAt: null },
        select: { id: true },
      });
      if (!existing)
        throw new NotFoundException("Archiving reason not found");
      const used = await transaction.cat.count({
        where: { archivingReasonId: id, isTest },
      });
      if (used > 0 && !replacementReasonId)
        throw new ConflictException(
          "Choose a replacement archiving reason for assigned cats",
        );
      if (replacementReasonId === id)
        throw new BadRequestException(
          "Replacement archiving reason must be different",
        );
      const replacement = replacementReasonId
        ? await transaction.catArchivingReason.findFirst({
            where: { id: replacementReasonId, isTest, deletedAt: null },
          })
        : null;
      if (replacementReasonId && !replacement)
        throw new NotFoundException("Replacement archiving reason not found");
      if (replacement) {
        await transaction.cat.updateMany({
          where: { archivingReasonId: id, isTest },
          data: { archivingReasonId: replacement.id },
        });
      }
      await transaction.auditEvent.create({
        data: {
          archivingReasonId: id,
          actorUserId,
          eventType: CAT_AUDIT_EVENT_TYPES.archivingReasonDelete,
        },
      });
      await transaction.catArchivingReason.update({
        where: { id },
        data: { deletedAt: new Date(), version: { increment: 1 } },
      });
    });
  }
}
