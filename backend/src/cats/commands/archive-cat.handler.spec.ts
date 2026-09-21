import { PrismaService } from '../../database/prisma.service';
import { runInTestTransaction } from '../../test-utils/test-db';
import { ArchiveCatHandler } from './archive-cat.handler';

describe('ArchiveCatHandler', () => {
  it('archives a cat and writes an audit event', async () => {
    await runInTestTransaction(async (tx) => {
      const handler = new ArchiveCatHandler(tx as PrismaService);
      const actor = await tx.user.create({ data: { email: `${Date.now()}-${Math.random()}@example.com`, status: 'ACTIVE' } });
      const cat = await tx.cat.create({ data: { name: `Archive ${Date.now()}-${Math.random()}` } });
      const reason = await tx.catArchivationReason.create({ data: { name: `Adopted ${Date.now()}-${Math.random()}` } });

      const archived = await handler.execute({
        catId: cat.id,
        reasonId: reason.id,
        actorUserId: actor.id,
        currentUserIsTest: false,
      });

      expect(archived).toEqual({ id: cat.id });
      await expect(tx.cat.findUniqueOrThrow({ where: { id: cat.id } })).resolves.toMatchObject({
        status: 'ARCHIVED', archivationReasonId: reason.id, archivedAt: expect.any(Date),
      });
      await expect(tx.catAuditEvent.findFirstOrThrow({ where: { catId: cat.id } })).resolves.toMatchObject({
        eventType: 'cat_archived', actorUserId: actor.id, newValue: reason.name,
      });
    });
  });
});
