import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";

@Injectable()
export class ArchiveLocationHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(
    id: string,
    isTest: boolean,
    actorUserId?: string,
    replacementLocationId?: string,
  ): Promise<void> {
    await runInNewTransaction(this.prisma, async (tx) => {
      const location = await tx.location.findFirst({
        where: { id, isTest, deletedAt: null },
        select: { id: true, name: true },
      });
      if (!location) throw new NotFoundException("Location not found");
      const assignedCats = await tx.cat.findMany({
        where: { currentLocationId: id, isTest },
        select: { id: true },
      });
      if (assignedCats.length > 0 && !replacementLocationId)
        throw new ConflictException(
          "A replacement location is required for cats assigned here.",
        );
      if (assignedCats.length > 0) {
        if (replacementLocationId === id)
          throw new ConflictException(
            "Choose a different replacement location.",
          );
        const replacement = await tx.location.findFirst({
          where: {
            id: replacementLocationId,
            isTest,
            deletedAt: null,
            status: "ACTIVE",
          },
          select: { id: true, name: true },
        });
        if (!replacement)
          throw new NotFoundException("Replacement location not found");
        await tx.cat.updateMany({
          where: { currentLocationId: id, isTest },
          data: {
            currentLocationId: replacement.id,
            version: { increment: 1 },
            concurrencyToken: randomUUID(),
          },
        });
        if (actorUserId)
          await tx.auditEvent.createMany({
            data: assignedCats.map((cat) => ({
              catId: cat.id,
              actorUserId,
              eventType: "current_location_changed",
              locationId: replacement.id,
              isTest,
              oldValue: location.name,
              newValue: replacement.name,
            })),
          });
      }
      await tx.location.update({
        where: { id },
        data: {
          status: "ARCHIVED",
          deletedAt: new Date(),
          version: { increment: 1 },
        },
      });
      if (actorUserId)
        await tx.auditEvent.create({
          data: { locationId: id, actorUserId, action: "delete" },
        });
    });
  }
}
