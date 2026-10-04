import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";
import { CatPhotoUrlService } from "../cat-photo-url.service";
import { UpdateCatCommand } from "../dto/update-cat.dto";
import { CAT_CARD_INCLUDE } from "../cats.types";
import { toCatCard } from "../cats.mappers";
import {
  toCatFieldAuditEvents,
  toCatUpdateData,
  validateCatId,
  validateCatUpdate,
} from "../cats.handler-utils";

@Injectable()
export class UpdateCatHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly photoUrls: CatPhotoUrlService,
  ) {}

  async handle(
    id: string,
    data: UpdateCatCommand,
    actorUserId: string | undefined,
    isTest: boolean,
  ) {
    validateCatId(id);
    validateCatUpdate(data);
    const updateData = toCatUpdateData(data);
    return runInNewTransaction(this.prisma, async (tx) => {
      const existing = await tx.cat.findFirst({
        where: { id, isTest },
        include: CAT_CARD_INCLUDE,
      });
      if (!existing) throw new NotFoundException("Cat not found");
      let nextLocationName: string | null = null;
      if (data.currentLocationId) {
        const location = await tx.location.findUnique({
          where: { id: data.currentLocationId },
          select: { status: true, isTest: true, name: true },
        });
        if (location?.status !== "ACTIVE" || location.isTest !== isTest)
          throw new NotFoundException("Active location not found");
        nextLocationName = location.name;
      }
      if (updateData.microchipNumber) {
        const duplicate = await tx.cat.findFirst({
          where: {
            id: { not: id },
            microchipNumber: updateData.microchipNumber,
          },
          select: { id: true },
        });
        if (duplicate)
          throw new ConflictException(
            "A cat with this microchip or passport number already exists",
          );
      }
      if (updateData.passportNumber) {
        const duplicate = await tx.cat.findFirst({
          where: { id: { not: id }, passportNumber: updateData.passportNumber },
          select: { id: true },
        });
        if (duplicate)
          throw new ConflictException(
            "A cat with this microchip or passport number already exists",
          );
      }
      if (Object.keys(updateData).length === 0)
        return toCatCard(existing, this.photoUrls);

      let assignedNameNumber: number | undefined;
      if (updateData.name !== undefined && updateData.name !== existing.name) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${isTest}:${updateData.name}`}))`;
        const highestNumber = await tx.cat.aggregate({
          where: { name: updateData.name, isTest },
          _max: { nameNumber: true },
        });
        assignedNameNumber = (highestNumber._max.nameNumber ?? 0) + 1;
      }

      const updated = await tx.cat.update({
        where: { id },
        data: {
          ...updateData,
          ...(assignedNameNumber !== undefined
            ? { nameNumber: assignedNameNumber }
            : {}),
        },
        include: CAT_CARD_INCLUDE,
      });
      if (
        existing.currentLocationId !== updated.currentLocationId &&
        updated.currentLocationId
      ) {
        await tx.location.update({
          where: { id: updated.currentLocationId },
          data: { version: { increment: 1 } },
        });
      }
      if (actorUserId) {
        const events = toCatFieldAuditEvents(
          existing,
          updateData,
          actorUserId,
        ).map((event) =>
          event.eventType === "current_location_changed"
            ? {
                ...event,
                locationId:
                  updated.currentLocationId ?? existing.currentLocationId,
                oldValue: existing.currentLocation?.name ?? "Not set",
                newValue: nextLocationName ?? "Not set",
              }
            : event,
        );
        if (existing.nameNumber !== updated.nameNumber) {
          events.push({
            catId: id,
            actorUserId,
            eventType: "name_number_changed",
            oldValue: String(existing.nameNumber),
            newValue: String(updated.nameNumber),
          });
        }
        if (events.length) await tx.auditEvent.createMany({ data: events });
      }
      return toCatCard(updated, this.photoUrls);
    });
  }
}
