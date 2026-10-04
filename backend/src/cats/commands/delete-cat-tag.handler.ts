import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";
import { validateCatId } from "../cats.handler-utils";

@Injectable()
export class DeleteCatTagHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(id: string, actorUserId?: string, isTest = false): Promise<void> {
    validateCatId(id, "Tag ID");
    await runInNewTransaction(this.prisma, async (tx) => {
      const tag = await tx.catTag.findFirst({
        where: { id, deletedAt: null, isTest },
        select: { id: true },
      });
      if (!tag) throw new NotFoundException("Tag not found");
      const assignments = await tx.catTagOnCat.findMany({
        where: { tagId: id, cat: { isTest }, deletedAt: null },
        select: { catId: true },
      });
      if (actorUserId)
        await tx.auditEvent.create({
          data: { tagId: id, actorUserId, action: "delete" },
        });
      await tx.catTagOnCat.updateMany({
        where: { tagId: id, cat: { isTest }, deletedAt: null },
        data: { deletedAt: new Date(), version: { increment: 1 } },
      });
      if (actorUserId) {
        await Promise.all(
          assignments.map(({ catId }) =>
            tx.auditEvent.create({
              data: {
                catId,
                actorUserId,
                eventType: CAT_AUDIT_EVENT_TYPES.tagRemovedFromCat,
                tagId: id,
              },
            }),
          ),
        );
      }
      await tx.catTag.update({
        where: { id },
        data: { deletedAt: new Date(), version: { increment: 1 } },
      });
    });
  }
}
