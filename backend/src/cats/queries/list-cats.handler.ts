import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { CatPhotoUrlService } from "../cat-photo-url.service";
import { CAT_CARD_INCLUDE, CatFilters, CatWithLocation } from "../cats.types";
import { toCatCard } from "../cats.mappers";

@Injectable()
export class ListCatsHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly photoUrls: CatPhotoUrlService,
  ) {}

  async handle(filters: CatFilters, isTest: boolean) {
    const skip = filters.skip ?? 0;
    const limit = filters.limit ?? 50;
    if (!Number.isInteger(skip) || skip < 0)
      throw new BadRequestException("skip must be a non-negative integer");
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      throw new BadRequestException(
        "limit must be an integer between 1 and 100",
      );
    const where: Prisma.CatWhereInput = {
      isTest,
      archivingReasonId: filters.archived ? { not: null } : null,
    };
    if (filters.locationId) {
      const location = await this.prisma.location.findFirst({
        where: { id: filters.locationId, isTest, deletedAt: null },
        select: { parentId: true },
      });
      if (location?.parentId === null) {
        const sublocations = await this.prisma.location.findMany({
          where: { parentId: filters.locationId, isTest, deletedAt: null },
          select: { id: true },
        });
        where.currentLocationId = {
          in: [filters.locationId, ...sublocations.map(({ id }) => id)],
        };
      } else {
        where.currentLocationId = filters.locationId;
      }
    }
    if (filters.tagId)
      where.tags = { some: { tagId: filters.tagId, deletedAt: null } };
    if (filters.archivingReasonId)
      where.archivingReasonId = filters.archivingReasonId;
    if (filters.archivedYear !== undefined) {
      const yearStart = new Date(Date.UTC(filters.archivedYear, 0, 1));
      const yearEnd = new Date(Date.UTC(filters.archivedYear + 1, 0, 1));
      where.archivedAt = { gte: yearStart, lt: yearEnd };
    }
    if (filters.ageGroup) {
      const oneYearAgo = new Date();
      oneYearAgo.setUTCFullYear(oneYearAgo.getUTCFullYear() - 1);
      if (filters.ageGroup === "KITTEN") {
        where.estimatedBirthDate = { gt: oneYearAgo };
      } else {
        where.AND = [
          {
            OR: [
              { estimatedBirthDate: null },
              { estimatedBirthDate: { lte: oneYearAgo } },
            ],
          },
        ];
      }
    }
    if (filters.intakeSource) where.intakeSource = filters.intakeSource;
    const search = filters.search?.trim();
    if (search)
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { microchipNumber: { contains: search, mode: "insensitive" } },
        { sponsorName: { contains: search, mode: "insensitive" } },
      ];
    const [cats, total] = await Promise.all([
      this.prisma.cat.findMany({
        where,
        include: CAT_CARD_INCLUDE,
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        skip,
        take: limit,
      }),
      this.prisma.cat.count({ where }),
    ]);
    return {
      data: await Promise.all(
        cats.map((cat) => toCatCard(cat as CatWithLocation, this.photoUrls)),
      ),
      total,
      skip,
      limit,
    };
  }
}
