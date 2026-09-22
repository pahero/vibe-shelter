import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { runInNewTransaction } from '../../database/helpers';
import { CAT_AUDIT_EVENT_TYPES } from '../cat-audit-event-types';

@Injectable()
export class DeleteArchivationReasonCommand {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string, actorUserId: string, replacementReasonId?: string): Promise<void> {
    const existing = await this.prisma.catArchivationReason.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Archivation reason not found');
    const used = await this.prisma.cat.count({ where: { archivationReasonId: id } });
    if (used > 0 && !replacementReasonId) throw new ConflictException('Choose a replacement archivation reason for assigned cats');
    if (replacementReasonId === id) throw new BadRequestException('Replacement archivation reason must be different');
    const replacement = replacementReasonId
      ? await this.prisma.catArchivationReason.findFirst({ where: { id: replacementReasonId, deletedAt: null } })
      : null;
    if (replacementReasonId && !replacement) throw new NotFoundException('Replacement archivation reason not found');

    await runInNewTransaction(this.prisma, async (transaction) => {
      if (replacement) {
        await transaction.cat.updateMany({ where: { archivationReasonId: id }, data: { archivationReasonId: replacement.id } });
      }
      await transaction.catAuditEvent.create({
        data: { archivationReasonId: id, actorUserId, eventType: CAT_AUDIT_EVENT_TYPES.archivationReasonDelete, oldValue: existing.name, newValue: replacement?.name ?? null },
      });
      await transaction.catArchivationReason.update({ where: { id }, data: { deletedAt: new Date() } });
    });
  }
}
