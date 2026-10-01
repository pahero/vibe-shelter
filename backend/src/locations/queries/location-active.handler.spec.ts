import { PrismaService } from '../../database/prisma.service';
import { runInTestTransaction } from '../../test-utils/test-db';
import { LocationActiveHandler } from './location-active.handler';

describe('LocationActiveHandler', () => {
  it('returns true for active undeleted locations in the requested partition', async () => {
    await runInTestTransaction(async (tx) => {
      const active = await tx.location.create({ data: { name: `Active ${Date.now()}-${Math.random().toString(36).slice(2)}` } });
      await expect(new LocationActiveHandler(tx as PrismaService).handle(active.id, false)).resolves.toBe(true);
    });
  });

  it('returns false for an inactive location', async () => {
    await runInTestTransaction(async (tx) => {
      const inactive = await tx.location.create({ data: { name: `Inactive ${Date.now()}-${Math.random().toString(36).slice(2)}`, status: 'INACTIVE' } });
      await expect(new LocationActiveHandler(tx as PrismaService).handle(inactive.id, false)).resolves.toBe(false);
    });
  });

  it('returns false for a soft-deleted location', async () => {
    await runInTestTransaction(async (tx) => {
      const deleted = await tx.location.create({ data: { name: `Deleted ${Date.now()}-${Math.random().toString(36).slice(2)}`, deletedAt: new Date() } });
      await expect(new LocationActiveHandler(tx as PrismaService).handle(deleted.id, false)).resolves.toBe(false);
    });
  });

  it('returns false for a location in another partition', async () => {
    await runInTestTransaction(async (tx) => {
      const active = await tx.location.create({ data: { name: `Active ${Date.now()}-${Math.random().toString(36).slice(2)}` } });
      await expect(new LocationActiveHandler(tx as PrismaService).handle(active.id, true)).resolves.toBe(false);
    });
  });
});
