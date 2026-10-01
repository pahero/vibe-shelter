import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { runInTestTransaction } from '../../test-utils/test-db';
import { ListLocationsByOwnerHandler } from './list-locations-by-owner.handler';

describe('ListLocationsByOwnerHandler', () => {
  it('rejects a blank owner ID', async () => {
    await runInTestTransaction(async (tx) => {
      await expect(new ListLocationsByOwnerHandler(tx as PrismaService).handle(' ', false)).rejects.toThrow(BadRequestException);
    });
  });

  it('returns only active locations in the requested partition', async () => {
    await runInTestTransaction(async (tx) => {
      const owner = await tx.user.create({ data: { email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com` } });
      const regular = await tx.location.create({ data: { name: `Regular ${Date.now()}-${Math.random().toString(36).slice(2)}`, ownerId: owner.id } });
      await tx.location.create({ data: { name: `Test ${Date.now()}-${Math.random().toString(36).slice(2)}`, ownerId: owner.id, isTest: true } });
      const result = await new ListLocationsByOwnerHandler(tx as PrismaService).handle(owner.id, false);
      expect(result.map((location) => location.id)).toEqual([regular.id]);
    });
  });
});
