import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { runInNewTransaction } from '../../database/helpers';
import { PrismaService } from '../../database/prisma.service';
import { CAT_AUDIT_EVENT_TYPES } from '../cat-audit-event-types';

export type DearchiveCatInput = {
  catId: string;
  actorUserId: string;
  currentUserIsTest: boolean;
};

@Injectable()
export class DearchiveCatHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: DearchiveCatInput): Promise<{ id: string }> {
    const cat = await this.prisma.cat.findFirst({ where: { id: input.catId, isTest: input.currentUserIsTest } });
    if (!cat) throw new NotFoundException('Cat not found');
    if (!cat.archivationReasonId) throw new ConflictException('Cat is not archived');

    await runInNewTransaction(this.prisma, async (transaction) => {
      await transaction.cat.update({
        where: { id: cat.id },
        data: { archivedAt: null, archivationReasonId: null },
      });
      await transaction.catAuditEvent.create({
        data: {
          catId: cat.id,
          actorUserId: input.actorUserId,
          eventType: CAT_AUDIT_EVENT_TYPES.catDearchived,
          oldValue: 'ARCHIVED',
          newValue: 'ACTIVE',
        },
      });
    });

    return { id: cat.id };
  }
}
