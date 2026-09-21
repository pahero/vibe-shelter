import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { runInNewTransaction } from '../../database/helpers';
import { CAT_AUDIT_EVENT_TYPES } from '../cat-audit-event-types';

export type ArchiveCatInput = {
  catId: string;
  reasonId: string;
  actorUserId: string;
  currentUserIsTest: boolean;
};

export type ArchiveCatResult = {
  id: string;
};

@Injectable()
export class ArchiveCatHandler {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: ArchiveCatInput): Promise<ArchiveCatResult> {
    const cat = await this.prisma.cat.findFirst({
      where: { id: input.catId, isTest: input.currentUserIsTest },
    });
    if (!cat) throw new NotFoundException('Cat not found');
    if (cat.status === 'ARCHIVED') throw new ConflictException('Cat is already archived');

    const reason = await this.prisma.catArchivationReason.findFirst({ where: { id: input.reasonId, deletedAt: null } });
    if (!reason) throw new NotFoundException('Archivation reason not found');

    await runInNewTransaction(this.prisma, async (transaction) => {
      await transaction.cat.update({
        where: { id: cat.id },
        data: { status: 'ARCHIVED', archivedAt: new Date(), archivationReasonId: reason.id },
      });
      await transaction.catAuditEvent.create({
        data: {
          catId: cat.id,
          actorUserId: input.actorUserId,
          eventType: CAT_AUDIT_EVENT_TYPES.catArchived,
          oldValue: null,
          newValue: reason.name,
        },
      });
    });

    return { id: cat.id };
  }
}
