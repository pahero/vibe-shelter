import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";

@Injectable()
export class ArchiveLocationHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(
    id: string,
    isTest: boolean,
    actorUserId?: string,
  ): Promise<void> {
    await runInNewTransaction(this.prisma, async (tx) => {
      const location = await tx.location.findFirst({
        where: { id, isTest, deletedAt: null },
        select: { id: true },
      });
      if (!location) throw new NotFoundException("Location not found");
      const assignedCats = await tx.cat.count({
        where: { currentLocationId: id, isTest },
      });
      if (assignedCats > 0)
        throw new ConflictException(
          "Cannot remove a location that is assigned to cats. Move the cats to another location first.",
        );
      await tx.location.update({
        where: { id },
        data: {
          status: "ARCHIVED",
          deletedAt: new Date(),
          version: { increment: 1 },
        },
      });
      if (actorUserId)
        await tx.locationAuditEvent.create({
          data: { locationId: id, actorUserId, action: "delete" },
        });
    });
  }
}
