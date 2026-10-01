import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { runInTestTransaction } from '../../test-utils/test-db';
import { GetLocationHandler } from './get-location.handler';

describe('GetLocationHandler', () => {
  it('rejects an empty ID', async () => {
    await runInTestTransaction(async (tx) => {
      await expect(new GetLocationHandler(tx as PrismaService).handle('', false)).rejects.toThrow(BadRequestException);
    });
  });

  it('rejects a missing location', async () => {
    await runInTestTransaction(async (tx) => {
      await expect(new GetLocationHandler(tx as PrismaService).handle('missing', false)).rejects.toThrow(NotFoundException);
    });
  });

  it('hides an opposite-partition location', async () => {
    await runInTestTransaction(async (tx) => {
      const testLocation = await tx.location.create({ data: { name: `Test ${Date.now()}-${Math.random().toString(36).slice(2)}`, isTest: true } });
      await expect(new GetLocationHandler(tx as PrismaService).handle(testLocation.id, false)).rejects.toThrow(NotFoundException);
    });
  });

  it('returns a location in the matching partition', async () => {
    await runInTestTransaction(async (tx) => {
      const location = await tx.location.create({ data: { name: `Test ${Date.now()}-${Math.random().toString(36).slice(2)}`, isTest: true } });
      await expect(new GetLocationHandler(tx as PrismaService).handle(location.id, true)).resolves.toMatchObject({ id: location.id });
    });
  });

  it('hides a soft-deleted location', async () => {
    await runInTestTransaction(async (tx) => {
      const testLocation = await tx.location.create({ data: { name: `Test ${Date.now()}-${Math.random().toString(36).slice(2)}`, isTest: true, deletedAt: new Date() } });
      await expect(new GetLocationHandler(tx as PrismaService).handle(testLocation.id, true)).rejects.toThrow(NotFoundException);
    });
  });
});
