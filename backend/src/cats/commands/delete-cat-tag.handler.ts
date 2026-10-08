import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";
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
      if (actorUserId)
        await tx.auditEvent.create({
          data: { tagId: id, actorUserId, action: "delete" },
        });
      await tx.catTag.update({
        where: { id },
        data: { deletedAt: new Date(), version: { increment: 1 } },
      });
    });
  }
}
