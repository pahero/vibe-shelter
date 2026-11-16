import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { LocationStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";

const VALID_STATUSES = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;

@Injectable()
export class UpdateLocationHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(
    id: string,
    data: {
      name?: string;
      ownerIds?: string[];
      status?: string;
      parentId?: string | null;
    },
    isTest: boolean,
    actorUserId?: string,
  ) {
    const updateData: Prisma.LocationUpdateInput = {};
    updateData.version = { increment: 1 };
    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) throw new BadRequestException("Location name is required");
      updateData.name = name;
    }
    if (data.status !== undefined) {
      if (
        !VALID_STATUSES.includes(data.status as (typeof VALID_STATUSES)[number])
      ) {
        throw new BadRequestException(
          `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        );
      }
      updateData.status = data.status as LocationStatus;
    }
    if (data.parentId !== undefined)
      updateData.parent = data.parentId
        ? { connect: { id: data.parentId } }
        : { disconnect: true };
    return runInNewTransaction(this.prisma, async (tx) => {
      const existing = await tx.location.findFirst({
        where: { id, isTest, deletedAt: null },
        include: {
          owners: {
            include: {
              user: { select: { id: true, fullName: true, email: true } },
            },
          },
          parent: { select: { name: true } },
        },
      });
      if (!existing) throw new NotFoundException("Location not found");
      let newParentName: string | null = null;
      if (data.parentId !== undefined && data.parentId !== existing.parentId) {
        if (data.parentId === id)
          throw new BadRequestException("A location cannot be its own parent");
        if (data.parentId) {
          const parent = await tx.location.findFirst({
            where: {
              id: data.parentId,
              isTest,
              deletedAt: null,
              status: "ACTIVE",
              parentId: null,
            },
            select: { id: true, name: true },
          });
          if (!parent)
            throw new BadRequestException("Parent location is unavailable");
          newParentName = parent.name;
          await tx.location.update({
            where: { id },
            data: { version: { increment: 1 } },
          });
          const sublocationCount = await tx.location.count({
            where: { parentId: id, isTest, deletedAt: null },
          });
          if (sublocationCount)
            throw new BadRequestException(
              "A location with sublocations cannot be made a sublocation",
            );
          const updatedParent = await tx.location.updateMany({
            where: {
              id: parent.id,
              isTest,
              deletedAt: null,
              status: "ACTIVE",
              parentId: null,
            },
            data: { version: { increment: 1 } },
          });
          if (updatedParent.count !== 1)
            throw new BadRequestException("Parent location is unavailable");
        }
        if (existing.parentId) {
          await tx.location.update({
            where: { id: existing.parentId },
            data: { version: { increment: 1 } },
          });
        }
      }
      const ids =
        data.ownerIds === undefined ? undefined : [...new Set(data.ownerIds)];
      const oldIds = new Set(existing.owners.map(({ userId }) => userId));
      const addedIds = ids?.filter((userId) => !oldIds.has(userId)) ?? [];
      const removed =
        ids === undefined
          ? []
          : existing.owners.filter(({ userId }) => !ids.includes(userId));
      let added: { id: string; fullName: string; email: string }[] = [];
      if (addedIds.length) {
        const result = await tx.user.updateMany({
          where: {
            id: { in: addedIds },
            deletedAt: null,
            status: "ACTIVE",
            isTest,
          },
          data: { version: { increment: 1 } },
        });
        if (result.count !== addedIds.length)
          throw new BadRequestException("One or more owners are unavailable");
        added = await tx.user.findMany({
          where: { id: { in: addedIds } },
          select: { id: true, fullName: true, email: true },
        });
      }
      if (data.name !== undefined) {
        const duplicate = await tx.location.findFirst({
          where: {
            id: { not: id },
            name: data.name.trim(),
            isTest,
            deletedAt: null,
          },
          select: { id: true },
        });
        if (duplicate)
          throw new ConflictException(
            "A location with this name already exists",
          );
      }
      const updated = await tx.location.update({
        where: { id },
        data: updateData,
      });
      if (removed.length)
        await tx.locationOwner.deleteMany({
          where: {
            locationId: id,
            userId: { in: removed.map(({ userId }) => userId) },
          },
        });
      if (added.length)
        await tx.locationOwner.createMany({
          data: added.map(({ id: userId }) => ({ locationId: id, userId })),
        });
      if (actorUserId) {
        const fields = [
          ...(existing.name !== updated.name
            ? [
                {
                  action: "name_changed",
                  oldValue: existing.name,
                  newValue: updated.name,
                },
              ]
            : []),
          ...added.map((user) => ({
            action: "owner_changed",
            oldValue: "Not assigned",
            newValue: `${user.fullName || user.email} <${user.email}>`,
            relatedUserId: user.id,
          })),
          ...removed.map(({ user }) => ({
            action: "owner_changed",
            oldValue: `${user.fullName || user.email} <${user.email}>`,
            newValue: "Not assigned",
            relatedUserId: user.id,
          })),
          ...(existing.status !== updated.status
            ? [
                {
                  action: "status_changed",
                  oldValue: existing.status,
                  newValue: updated.status,
                },
              ]
            : []),
          ...(existing.parentId !== updated.parentId
            ? [
                {
                  action: "parent_changed",
                  oldValue: existing.parent?.name ?? "Top level",
                  newValue: newParentName ?? "Top level",
                  relatedLocationId: updated.parentId ?? existing.parentId,
                },
              ]
            : []),
        ];
        if (fields.length)
          await tx.auditEvent.createMany({
            data: fields.map((field) => ({
              locationId: id,
              actorUserId,
              isTest,
              eventType: "location_action",
              ...field,
            })),
          });
      }
      return { id: updated.id };
    });
  }
}
