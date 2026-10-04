import { ConflictException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";
import {
  MutationResultDto,
  validateArchivationReasonName,
} from "./archivation-reason.types";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";

@Injectable()
export class CreateArchivationReasonCommand {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    nameInput: string,
    actorUserId: string,
    isTest: boolean,
  ): Promise<MutationResultDto> {
    const name = validateArchivationReasonName(nameInput);
    const reason = await runInNewTransaction(
      this.prisma,
      async (transaction) => {
        const existing = await transaction.catArchivationReason.findFirst({
          where: { name, isTest, deletedAt: null },
          select: { id: true },
        });
        if (existing)
          throw new ConflictException(
            "An archivation reason with this name already exists",
          );
        const created = await transaction.catArchivationReason.create({
          data: { name, isTest },
        });
        await transaction.catAuditEvent.create({
          data: {
            archivationReasonId: created.id,
            actorUserId,
            eventType: CAT_AUDIT_EVENT_TYPES.archivationReasonCreate,
          },
        });
        return created;
      },
    );
    return { id: reason.id };
  }
}
