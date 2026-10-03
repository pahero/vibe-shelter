import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { CatPhotoUrlService } from "../cat-photo-url.service";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";
import { CatCard } from "../cats.types";
import { CreateCatCommand } from "./create-cat.command";
import { WriteCatAuditEventCommand } from "./write-cat-audit-event.command";
import { runInNewTransaction } from "@/database/helpers";

const CAT_CARD_INCLUDE = {
  currentLocation: { select: { name: true } },
} satisfies Prisma.CatInclude;

@Injectable()
export class CreateCatHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly photoUrls: CatPhotoUrlService,
    private readonly auditWriter: WriteCatAuditEventCommand,
  ) {}

  async execute(command: CreateCatCommand): Promise<CatCard> {
    const cat = await runInNewTransaction(this.prisma, async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${command.isTest}:${command.name}`}))`;
      const highestNumber = await transaction.cat.aggregate({
        where: { name: command.name, isTest: command.isTest },
        _max: { nameNumber: true },
      });
      if (command.currentLocationId) {
        const location = await transaction.location.findUnique({
          where: { id: command.currentLocationId },
          select: { status: true, isTest: true },
        });
        if (
          location?.status !== "ACTIVE" ||
          location.isTest !== command.isTest
        ) {
          throw new NotFoundException("Active location not found");
        }
        await transaction.location.update({
          where: { id: command.currentLocationId },
          data: { version: { increment: 1 } },
        });
      }

      if (command.microchipNumber) {
        const catWithMicrochip = await transaction.cat.findUnique({
          where: { microchipNumber: command.microchipNumber },
          select: { id: true },
        });
        if (catWithMicrochip) {
          throw new ConflictException(
            "A cat with this microchip number already exists",
          );
        }
      }

      if (command.passportNumber) {
        const catWithPassport = await transaction.cat.findUnique({
          where: { passportNumber: command.passportNumber },
          select: { id: true },
        });
        if (catWithPassport) {
          throw new ConflictException(
            "A cat with this passport number already exists",
          );
        }
      }

      const created = await transaction.cat.create({
        data: {
          name: command.name,
          nameNumber: (highestNumber._max.nameNumber ?? 0) + 1,
          sex: command.sex,
          color: command.color,
          estimatedBirthDate: command.estimatedBirthDate,
          intakeDate: command.intakeDate,
          rescueSource: command.rescueSource,
          microchipNumber: command.microchipNumber,
          passportNumber: command.passportNumber,
          adopterName: command.adopterName,
          adopterAddress: command.adopterAddress,
          sterilizationStatus: command.sterilizationStatus,
          currentLocationId: command.currentLocationId,
          createdByUserId: command.createdByUserId,
          isTest: command.isTest,
        },
        include: CAT_CARD_INCLUDE,
      });
      await this.auditWriter.execute(transaction, {
        catId: created.id,
        actorUserId: command.createdByUserId,
        eventType: CAT_AUDIT_EVENT_TYPES.catCreated,
      });
      return created;
    });

    return {
      id: cat.id,
      name: cat.name,
      nameNumber: cat.nameNumber,
      sex: cat.sex,
      color: cat.color,
      estimatedBirthDate: cat.estimatedBirthDate?.toISOString() ?? null,
      intakeDate: cat.intakeDate?.toISOString() ?? null,
      archivedAt: null,
      archivationReasonId: null,
      archivationReasonName: null,
      isTest: cat.isTest,
      sterilizationStatus: cat.sterilizationStatus,
      currentLocationId: cat.currentLocationId,
      currentLocationName: cat.currentLocation?.name ?? null,
      createdByUserId: cat.createdByUserId,
      primaryPhotoUrl: await this.photoUrls.getPrimaryPhotoUrl(
        cat.primaryPhotoKey,
      ),
      microchipNumber: cat.microchipNumber,
      passportNumber: cat.passportNumber,
      adopterName: cat.adopterName,
      adopterAddress: cat.adopterAddress,
      felvFivTestDone: cat.felvFivTestDone,
      rescueSource: cat.rescueSource,
      updatedAt: cat.updatedAt.toISOString(),
      tags: [],
    };
  }
}
