import { ConflictException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";
import {
  MutationResultDto,
  validateArchivingReasonName,
} from "./archiving-reason.types";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";

@Injectable()
export class CreateArchivingReasonCommand {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    nameInput: string,
    actorUserId: string,
    isTest: boolean,
  ): Promise<MutationResultDto> {
    const name = validateArchivingReasonName(nameInput);
    const reason = await runInNewTransaction(
      this.prisma,
      async (transaction) => {
        const existing = await transaction.catArchivingReason.findFirst({
          where: { name, isTest, deletedAt: null },
          select: { id: true },
        });
        if (existing)
          throw new ConflictException(
            "An archiving reason with this name already exists",
          );
        const created = await transaction.catArchivingReason.create({
          data: { name, isTest },
        });
        await transaction.auditEvent.create({
          data: {
            archivingReasonId: created.id,
            actorUserId,
            eventType: CAT_AUDIT_EVENT_TYPES.archivingReasonCreate,
          },
        });
        return created;
      },
    );
    return { id: reason.id };
  }
}
