import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ListLocationsByOwnerHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(ownerId: string, isTest: boolean) {
    if (!ownerId?.trim()) throw new BadRequestException('Owner ID is required');
    return this.prisma.location.findMany({
      where: { ownerId, isTest, deletedAt: null },
      include: { owner: { select: { id: true, email: true, fullName: true } } },
      orderBy: { name: 'asc' },
    });
  }
}
