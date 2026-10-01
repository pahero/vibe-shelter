import { PrismaService } from '../../database/prisma.service';
import { runInTestTransaction } from '../../test-utils/test-db';
import { LocationExistsHandler } from './location-exists.handler';

describe('LocationExistsHandler', () => {
  it('returns true when the ID is in the requested test partition', async () => {
    await runInTestTransaction(async (tx) => {
      const location = await tx.location.create({ data: { name: `Test ${Date.now()}-${Math.random().toString(36).slice(2)}`, isTest: true } });
      await expect(new LocationExistsHandler(tx as PrismaService).handle(location.id, true)).resolves.toBe(true);
    });
  });

  it('returns false when the ID is outside the requested partition', async () => {
    await runInTestTransaction(async (tx) => {
      const location = await tx.location.create({ data: { name: `Test ${Date.now()}-${Math.random().toString(36).slice(2)}`, isTest: true } });
      await expect(new LocationExistsHandler(tx as PrismaService).handle(location.id, false)).resolves.toBe(false);
    });
  });

  it('returns false when the ID does not exist', async () => {
    await runInTestTransaction(async (tx) => {
      await expect(new LocationExistsHandler(tx as PrismaService).handle('missing', false)).resolves.toBe(false);
    });
  });
});
