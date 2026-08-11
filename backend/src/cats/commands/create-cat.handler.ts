import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CatPhotoUrlService } from '../cat-photo-url.service';
import { CatCard } from '../cats.service';
import { CreateCatCommand } from './create-cat.command';

const CAT_CARD_INCLUDE = {
  currentLocation: { select: { name: true } },
} satisfies Prisma.CatInclude;

@Injectable()
export class CreateCatHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly photoUrls: CatPhotoUrlService,
  ) {}

  async execute(command: CreateCatCommand): Promise<CatCard> {
    const cat = await this.prisma.$transaction(async (transaction) => {
        if (command.currentLocationId) {
          const location = await transaction.location.findUnique({
            where: { id: command.currentLocationId },
            select: { status: true },
          });
          if (location?.status !== 'ACTIVE') {
            throw new NotFoundException('Active location not found');
          }
        }

        if (command.microchipNumber) {
          const catWithMicrochip = await transaction.cat.findUnique({
            where: { microchipNumber: command.microchipNumber },
            select: { id: true },
          });
          if (catWithMicrochip) {
            throw new ConflictException('A cat with this microchip number already exists');
          }
        }

        if (command.passportNumber) {
          const catWithPassport = await transaction.cat.findUnique({
            where: { passportNumber: command.passportNumber },
            select: { id: true },
          });
          if (catWithPassport) {
            throw new ConflictException('A cat with this passport number already exists');
          }
        }

        const created = await transaction.cat.create({
          data: {
            name: command.name,
            sex: command.sex,
            color: command.color,
            estimatedBirthDate: command.estimatedBirthDate,
            intakeDate: command.intakeDate,
            rescueSource: command.rescueSource,
            microchipNumber: command.microchipNumber,
            passportNumber: command.passportNumber,
            sterilizationStatus: command.sterilizationStatus,
            currentLocationId: command.currentLocationId,
            createdByUserId: command.createdByUserId,
          },
          include: CAT_CARD_INCLUDE,
        });
        return created;
    });

    return {
      id: cat.id,
      name: cat.name,
      sex: cat.sex,
      color: cat.color,
      estimatedBirthDate: cat.estimatedBirthDate?.toISOString() ?? null,
      intakeDate: cat.intakeDate?.toISOString() ?? null,
      status: cat.status,
      sterilizationStatus: cat.sterilizationStatus,
      currentLocationId: cat.currentLocationId,
      currentLocationName: cat.currentLocation?.name ?? null,
      createdByUserId: cat.createdByUserId,
      primaryPhotoUrl: await this.photoUrls.getPrimaryPhotoUrl(cat.primaryPhotoKey),
      microchipNumber: cat.microchipNumber,
      updatedAt: cat.updatedAt.toISOString(),
      tags: [],
    };
  }
}
