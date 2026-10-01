import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { runInNewTransaction } from '../../database/helpers';

@Injectable()
export class ChangePasswordHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    await runInNewTransaction(this.prisma, async (tx) => {
      const user = await tx.user.findFirst({ where: { id: userId, deletedAt: null } });
      if (!user?.passwordHash || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
        throw new UnauthorizedException('Current password is incorrect');
      }
      await tx.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(newPassword, 10), passwordChangeRequired: false, version: { increment: 1 } } });
    });
  }
}
