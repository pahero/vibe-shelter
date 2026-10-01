import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { runInTestTransaction } from '../../test-utils/test-db';
import { ReactivateLocationHandler } from './reactivate-location.handler';

describe('ReactivateLocationHandler', () => {
  it('reactivates a nondeleted location', async () => {
    await runInTestTransaction(async (tx) => {
      const location = await tx.location.create({ data: { name: `Inactive ${Date.now()}-${Math.random().toString(36).slice(2)}`, status: 'INACTIVE' } });
      const result = await new ReactivateLocationHandler(tx as PrismaService).handle(location.id, false);
      expect(result).toEqual({ id: location.id });
      await expect(tx.location.findUniqueOrThrow({ where: { id: location.id } })).resolves.toMatchObject({ status: 'ACTIVE', version: 1 });
    });
  });

  it('rejects a missing location', async () => {
    await runInTestTransaction(async (tx) => {
      await expect(new ReactivateLocationHandler(tx as PrismaService).handle('missing', false)).rejects.toThrow(NotFoundException);
    });
  });

  it('hides an opposite-partition location', async () => {
    await runInTestTransaction(async (tx) => {
      const location = await tx.location.create({ data: { name: `Hidden ${Date.now()}-${Math.random().toString(36).slice(2)}`, isTest: true } });
      await expect(new ReactivateLocationHandler(tx as PrismaService).handle(location.id, false)).rejects.toThrow(NotFoundException);
    });
  });

  it('rejects a soft-deleted location', async () => {
    await runInTestTransaction(async (tx) => {
      const location = await tx.location.create({ data: { name: `Deleted ${Date.now()}-${Math.random().toString(36).slice(2)}`, deletedAt: new Date() } });
      await expect(new ReactivateLocationHandler(tx as PrismaService).handle(location.id, false)).rejects.toThrow(NotFoundException);
    });
  });
});
