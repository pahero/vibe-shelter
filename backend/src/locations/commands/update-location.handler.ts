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
      description?: string | null;
      ownerIds?: string[];
      status?: string;
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
    if (data.description !== undefined)
      updateData.description = data.description?.trim() || null;
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
    return runInNewTransaction(this.prisma, async (tx) => {
      const existing = await tx.location.findFirst({
        where: { id, isTest, deletedAt: null },
        include: {
          owners: {
            include: {
              user: { select: { id: true, fullName: true, email: true } },
            },
          },
        },
      });
      if (!existing) throw new NotFoundException("Location not found");
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
          ...(existing.description !== updated.description
            ? [
                {
                  action: "description_changed",
                  oldValue: existing.description ?? "Not set",
                  newValue: updated.description ?? "Not set",
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
