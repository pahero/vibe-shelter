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
        select: { id: true, name: true, parentId: true },
      });
      if (!location) throw new NotFoundException("Location not found");
      // Lock the parent before reading its children so a concurrent sublocation
      // creation either completes before this snapshot or fails after archival.
      const locked = await tx.location.updateMany({
        where: { id: location.id, isTest, deletedAt: null },
        data: { version: { increment: 1 } },
      });
      if (locked.count !== 1) throw new NotFoundException("Location not found");
      const sublocations = await tx.location.findMany({
        where: { parentId: id, isTest, deletedAt: null },
        select: { id: true, name: true },
      });
      if (sublocations.length) {
        const lockedSublocations = await tx.location.updateMany({
          where: {
            id: { in: sublocations.map((sublocation) => sublocation.id) },
            isTest,
            deletedAt: null,
          },
          data: { version: { increment: 1 } },
        });
        if (lockedSublocations.count !== sublocations.length)
          throw new NotFoundException("Sublocation not found");
      }
      const archivedLocationIds = [
        location.id,
        ...sublocations.map((sublocation) => sublocation.id),
      ];
      const assignedCats = await tx.cat.findMany({
        where: { currentLocationId: { in: archivedLocationIds }, isTest },
        select: { id: true, currentLocation: { select: { name: true } } },
      });
      if (assignedCats.length > 0 && !replacementLocationId)
        throw new ConflictException(
          "A replacement location is required for cats assigned here.",
        );
      if (assignedCats.length > 0) {
        const replacementId = replacementLocationId;
        if (!replacementId)
          throw new ConflictException(
            "A replacement location is required for cats assigned here.",
          );
        if (archivedLocationIds.includes(replacementId))
          throw new ConflictException(
            "Choose a replacement location outside the archived location tree.",
          );
        const replacement = await tx.location.findFirst({
          where: {
            id: replacementId,
            isTest,
            deletedAt: null,
            status: "ACTIVE",
          },
          select: { id: true, name: true },
        });
        if (!replacement)
          throw new NotFoundException("Replacement location not found");
        const reservedReplacement = await tx.location.updateMany({
          where: {
            id: replacement.id,
            isTest,
            deletedAt: null,
            status: "ACTIVE",
          },
          data: { version: { increment: 1 } },
        });
        if (reservedReplacement.count !== 1)
          throw new NotFoundException("Replacement location not found");
        await tx.cat.updateMany({
          where: { currentLocationId: { in: archivedLocationIds }, isTest },
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
              oldValue: cat.currentLocation.name,
              newValue: replacement.name,
            })),
          });
      }
      await tx.location.updateMany({
        where: { id: { in: archivedLocationIds } },
        data: {
          status: "ARCHIVED",
          deletedAt: new Date(),
          version: { increment: 1 },
        },
      });
      if (location.parentId)
        await tx.location.update({
          where: { id: location.parentId },
          data: { version: { increment: 1 } },
        });
      if (actorUserId)
        await tx.auditEvent.createMany({
          data: archivedLocationIds.map((locationId) => ({
            locationId,
            actorUserId,
            action: "delete",
            eventType: "location_action",
            isTest,
          })),
        });
    });
  }
}
