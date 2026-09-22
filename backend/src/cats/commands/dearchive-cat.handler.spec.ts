import { PrismaService } from '../../database/prisma.service';
import { runInTestTransaction } from '../../test-utils/test-db';
import { DearchiveCatHandler } from './dearchive-cat.handler';

describe('DearchiveCatHandler', () => {
  it('restores an archived cat and writes an audit event', async () => {
    await runInTestTransaction(async (tx) => {
      const handler = new DearchiveCatHandler(tx as PrismaService);
      const actor = await tx.user.create({ data: { email: `${Date.now()}-${Math.random()}@example.com`, status: 'ACTIVE' } });
      const reason = await tx.catArchivationReason.create({ data: { name: `Reason ${Date.now()}-${Math.random()}` } });
      const cat = await tx.cat.create({ data: { name: `Archived ${Date.now()}-${Math.random()}`, archivedAt: new Date(), archivationReasonId: reason.id } });

      await expect(handler.execute({ catId: cat.id, actorUserId: actor.id, currentUserIsTest: false })).resolves.toEqual({ id: cat.id });
      await expect(tx.cat.findUniqueOrThrow({ where: { id: cat.id } })).resolves.toMatchObject({
        archivedAt: null, archivationReasonId: null,
      });
      await expect(tx.catAuditEvent.findFirstOrThrow({ where: { catId: cat.id } })).resolves.toMatchObject({
        eventType: 'cat_dearchived', actorUserId: actor.id, oldValue: 'ARCHIVED', newValue: 'ACTIVE',
      });
    });
  });
});
