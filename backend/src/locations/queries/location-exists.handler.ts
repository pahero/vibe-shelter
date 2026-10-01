import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class LocationExistsHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(id: string, isTest: boolean): Promise<boolean> {
    const location = await this.prisma.location.findUnique({ where: { id }, select: { isTest: true } });
    return location?.isTest === isTest;
  }
}
