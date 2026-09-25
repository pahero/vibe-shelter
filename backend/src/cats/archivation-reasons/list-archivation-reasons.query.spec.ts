import { PrismaService } from '../../database/prisma.service';
import { runInTestTransaction } from '../../test-utils/test-db';
import { ListArchivationReasonsQuery } from './list-archivation-reasons.query';

describe('ListArchivationReasonsQuery', () => {
  it('returns active reasons ordered by name and hides soft-deleted reasons', async () => {
    await runInTestTransaction(async (tx) => {
      const query = new ListArchivationReasonsQuery(tx as PrismaService);
      const active = await tx.catArchivationReason.create({ data: { name: `Active ${Date.now()}-${Math.random()}` } });
      const deleted = await tx.catArchivationReason.create({ data: { name: `Deleted ${Date.now()}-${Math.random()}`, deletedAt: new Date() } });

      const reasons = await query.execute();
      expect(reasons).toEqual(expect.arrayContaining([{ id: active.id, name: active.name }]));
      expect(reasons).not.toEqual(expect.arrayContaining([{ id: deleted.id, name: deleted.name }]));
    });
  });
});
