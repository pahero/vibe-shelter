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
      ownerId?: string | null;
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
    if (data.ownerId !== undefined)
      updateData.owner = data.ownerId?.trim()
        ? { connect: { id: data.ownerId.trim() } }
        : { disconnect: true };
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
        include: { owner: { select: { fullName: true, email: true } } },
      });
      if (!existing) throw new NotFoundException("Location not found");
      let nextOwner: {
        id: string;
        fullName: string | null;
        email: string;
      } | null = null;
      if (data.ownerId?.trim()) {
        nextOwner = await tx.user.findFirst({
          where: { id: data.ownerId.trim(), deletedAt: null },
          select: { id: true, fullName: true, email: true },
        });
        if (!nextOwner)
          throw new BadRequestException("Specified owner user does not exist");
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
        include: {
          owner: { select: { id: true, email: true, fullName: true } },
        },
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
          ...(existing.ownerId !== updated.ownerId
            ? [
                {
                  action: "owner_changed",
                  oldValue: existing.owner
                    ? `${existing.owner.fullName || existing.owner.email} <${existing.owner.email}>`
                    : "Not set",
                  newValue: nextOwner
                    ? `${nextOwner.fullName || nextOwner.email} <${nextOwner.email}>`
                    : "Not set",
                  relatedUserId: nextOwner?.id ?? existing.ownerId,
                },
              ]
            : []),
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
              ...field,
            })),
          });
      }
      if (existing.ownerId !== updated.ownerId && nextOwner) {
        await tx.user.update({
          where: { id: nextOwner.id },
          data: { version: { increment: 1 } },
        });
      }
      return { id: updated.id };
    });
  }
}
