import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ReactivateLocationHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(id: string, isTest: boolean): Promise<{ id: string }> {
    const location = await this.prisma.location.findFirst({ where: { id, isTest, deletedAt: null }, select: { id: true } });
    if (!location) throw new NotFoundException('Location not found');
    await this.prisma.location.update({ where: { id }, data: { status: 'ACTIVE', version: { increment: 1 } } });
    return { id };
  }
}
