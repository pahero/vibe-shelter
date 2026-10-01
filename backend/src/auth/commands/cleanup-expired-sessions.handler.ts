import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CleanupExpiredSessionsHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(): Promise<{ count: number }> {
    return this.prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  }
}
