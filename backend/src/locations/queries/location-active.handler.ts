import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class LocationActiveHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(id: string, isTest: boolean): Promise<boolean> {
    const location = await this.prisma.location.findFirst({ where: { id, isTest, deletedAt: null }, select: { status: true } });
    return location?.status === 'ACTIVE';
  }
}
