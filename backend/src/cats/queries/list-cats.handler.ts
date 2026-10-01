import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CatPhotoUrlService } from '../cat-photo-url.service';
import { CAT_CARD_INCLUDE, CatFilters, CatWithLocation } from '../cats.types';
import { toCatCard } from '../cats.mappers';

@Injectable()
export class ListCatsHandler {
  constructor(private readonly prisma: PrismaService, private readonly photoUrls: CatPhotoUrlService) {}

  async handle(filters: CatFilters, isTest: boolean) {
    const skip = filters.skip ?? 0;
    const limit = filters.limit ?? 50;
    if (!Number.isInteger(skip) || skip < 0) throw new BadRequestException('skip must be a non-negative integer');
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new BadRequestException('limit must be an integer between 1 and 100');
    const where: Prisma.CatWhereInput = { isTest, archivationReasonId: filters.archived ? { not: null } : null };
    if (filters.locationId) where.currentLocationId = filters.locationId;
    if (filters.tagId) where.tags = { some: { tagId: filters.tagId } };
    const search = filters.search?.trim();
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { microchipNumber: { contains: search, mode: 'insensitive' } },
      { passportNumber: { contains: search, mode: 'insensitive' } },
    ];
    const [cats, total] = await Promise.all([
      this.prisma.cat.findMany({ where, include: CAT_CARD_INCLUDE, orderBy: [{ name: 'asc' }, { id: 'asc' }], skip, take: limit }),
      this.prisma.cat.count({ where }),
    ]);
    return { data: await Promise.all(cats.map((cat) => toCatCard(cat as CatWithLocation, this.photoUrls))), total, skip, limit };
  }
}
