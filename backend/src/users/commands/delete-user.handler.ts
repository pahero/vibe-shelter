import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { runInNewTransaction } from '../../database/helpers';

@Injectable()
export class DeleteUserHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(id: string): Promise<void> {
    await runInNewTransaction(this.prisma, async (tx) => {
      const user = await tx.user.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
      if (!user) throw new NotFoundException('User not found');
      await tx.user.update({ where: { id }, data: { deletedAt: new Date(), status: 'INACTIVE', version: { increment: 1 } } });
      await tx.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    });
  }
}
