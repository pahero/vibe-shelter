import { BadRequestException, Injectable } from '@nestjs/common';
import { LocationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const VALID_STATUSES = ['ACTIVE', 'INACTIVE', 'ARCHIVED'] as const;

@Injectable()
export class ListLocationsHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(filters: { ownerId?: string; status?: string; skip?: number; limit?: number }, isTest: boolean) {
    const { ownerId, status, skip = 0, limit = 50 } = filters;
    if (status && !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
      throw new BadRequestException(`Invalid status filter. Must be one of: ${VALID_STATUSES.join(', ')}`);
    }
    if (!Number.isInteger(skip) || skip < 0 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException('Invalid pagination');
    }
    const where: Prisma.LocationWhereInput = { isTest, deletedAt: null };
    if (ownerId) where.ownerId = ownerId;
    if (status) where.status = status as LocationStatus;
    const [data, total] = await Promise.all([
      this.prisma.location.findMany({ where, include: { owner: { select: { id: true, email: true, fullName: true } } }, orderBy: { name: 'asc' }, skip, take: limit }),
      this.prisma.location.count({ where }),
    ]);
    return { data, total, skip, limit };
  }
}
