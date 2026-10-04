import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";
import {
  MutationResultDto,
  validateArchivingReasonName,
} from "./archiving-reason.types";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";

@Injectable()
export class UpdateArchivingReasonCommand {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    id: string,
    nameInput: string,
    actorUserId: string,
    isTest: boolean,
  ): Promise<MutationResultDto> {
    const name = validateArchivingReasonName(nameInput);
    const reason = await runInNewTransaction(
      this.prisma,
      async (transaction) => {
        const existing = await transaction.catArchivingReason.findFirst({
          where: { id, isTest, deletedAt: null },
        });
        if (!existing)
          throw new NotFoundException("Archiving reason not found");
        const duplicate = await transaction.catArchivingReason.findFirst({
          where: { name, deletedAt: null, isTest, id: { not: id } },
          select: { id: true },
        });
        if (duplicate)
          throw new ConflictException(
            "An archiving reason with this name already exists",
          );
        const updated = await transaction.catArchivingReason.update({
          where: { id },
          data: { name, version: { increment: 1 } },
        });
        await transaction.auditEvent.create({
          data: {
            archivingReasonId: id,
            actorUserId,
            eventType: CAT_AUDIT_EVENT_TYPES.archivingReasonUpdate,
            oldValue: existing.name,
            newValue: updated.name,
          },
        });
        return updated;
      },
    );
    return { id: reason.id };
  }
}
