import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { runInTestTransaction } from '../../test-utils/test-db';
import { ListLocationsHandler } from './list-locations.handler';

describe('ListLocationsHandler', () => {
  it('returns paginated nondeleted locations within the test partition', async () => {
    await runInTestTransaction(async (tx) => {
      const marker = `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random()}`;
      const first = await tx.location.create({ data: { name: `${marker} A` } });
      await tx.location.create({ data: { name: `${marker} B`, isTest: true } });
      const handler = new ListLocationsHandler(tx as PrismaService);
      const result = await handler.handle({ skip: 0, limit: 1 }, false);
      expect(result).toMatchObject({ total: expect.any(Number), skip: 0, limit: 1 });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(first.id);
    });
  });

  it('filters by owner and status', async () => {
    await runInTestTransaction(async (tx) => {
      const owner = await tx.user.create({ data: { email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com` } });
      const location = await tx.location.create({ data: { name: `Owned ${Date.now()}-${Math.random().toString(36).slice(2)}`, ownerId: owner.id, status: 'INACTIVE' } });
      const result = await new ListLocationsHandler(tx as PrismaService).handle({ ownerId: owner.id, status: 'INACTIVE' }, false);
      expect(result.data.map((item) => item.id)).toEqual([location.id]);
    });
  });

  it('rejects an invalid status filter', async () => {
    await runInTestTransaction(async (tx) => {
      await expect(new ListLocationsHandler(tx as PrismaService).handle({ status: 'BOGUS' }, false)).rejects.toThrow(BadRequestException);
    });
  });

  it('rejects invalid pagination', async () => {
    await runInTestTransaction(async (tx) => {
      await expect(new ListLocationsHandler(tx as PrismaService).handle({ limit: 101 }, false)).rejects.toThrow(BadRequestException);
    });
  });
});
