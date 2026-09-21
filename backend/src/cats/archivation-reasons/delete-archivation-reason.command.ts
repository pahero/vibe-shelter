import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { runInNewTransaction } from '../../database/helpers';

@Injectable()
export class DeleteArchivationReasonCommand {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string, actorUserId: string): Promise<void> {
    const existing = await this.prisma.catArchivationReason.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Archivation reason not found');
    const used = await this.prisma.cat.count({ where: { archivationReasonId: id } });
    if (used > 0) throw new ConflictException('Cannot remove an archivation reason used by cats');

    await runInNewTransaction(this.prisma, async (transaction) => {
      await transaction.catArchivationReasonAuditEvent.create({
        data: { reasonId: id, actorUserId, action: 'delete', oldValue: existing.name, newValue: null },
      });
      await transaction.catArchivationReason.update({ where: { id }, data: { deletedAt: new Date() } });
    });
  }
}
