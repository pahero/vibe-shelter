import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { runInNewTransaction } from '../../database/helpers';
import { CAT_AUDIT_EVENT_TYPES } from '../cat-audit-event-types';
import { validateCatId } from '../cats.handler-utils';

@Injectable()
export class DeleteCatTagHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(id: string, actorUserId?: string): Promise<void> {
    validateCatId(id, 'Tag ID');
    await runInNewTransaction(this.prisma, async (tx) => {
      const tag = await tx.catTag.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
      if (!tag) throw new NotFoundException('Tag not found');
      const assignments = await tx.catTagOnCat.findMany({ where: { tagId: id }, select: { catId: true } });
      if (actorUserId) await tx.tagAuditEvent.create({ data: { tagId: id, actorUserId, action: 'delete' } });
      await tx.catTagOnCat.deleteMany({ where: { tagId: id } });
      if (actorUserId) {
        await Promise.all(assignments.map(({ catId }) => tx.catAuditEvent.create({
          data: { catId, actorUserId, eventType: CAT_AUDIT_EVENT_TYPES.tagRemovedFromCat, tagId: id },
        })));
      }
      await tx.catTag.update({ where: { id }, data: { deletedAt: new Date(), version: { increment: 1 } } });
    });
  }
}
