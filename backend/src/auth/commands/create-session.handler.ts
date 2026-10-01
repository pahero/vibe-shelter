import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { runInNewTransaction } from '../../database/helpers';

@Injectable()
export class CreateSessionHandler {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  async handle(userId: string, userAgent?: string, ipAddress?: string): Promise<{ id: string }> {
    const sessionTokenHash = createHash('sha256').update(randomBytes(32).toString('hex')).digest('hex');
    const ttlMs = this.config.get<number>('sessionTtlMs', 7 * 24 * 60 * 60 * 1000);
    return runInNewTransaction(this.prisma, async (tx) => {
      const user = await tx.user.findFirst({ where: { id: userId, deletedAt: null }, select: { id: true, status: true } });
      if (!user) throw new NotFoundException('User not found');
      if (user.status !== 'ACTIVE') throw new UnauthorizedException('User account is inactive');
      const session = await tx.session.create({
        data: { userId, sessionTokenHash, userAgent, ipAddress, expiresAt: new Date(Date.now() + ttlMs) },
      });
      await tx.user.update({ where: { id: userId }, data: { lastLoginAt: new Date(), version: { increment: 1 } } });
      return { id: session.id };
    });
  }
}
