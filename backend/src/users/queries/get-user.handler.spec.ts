import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { runInTestTransaction } from '../../test-utils/test-db';
import { GetUserHandler } from './get-user.handler';

describe('GetUserHandler', () => {
  it('returns a mapped user without credential fields', async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({ data: { email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`, passwordHash: 'secret' } });
      const result = await new GetUserHandler(tx as PrismaService).handle(user.id);
      expect(result).toMatchObject({ id: user.id, email: user.email, role: 'staff', status: 'active' });
      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  it('rejects a missing user', async () => {
    await runInTestTransaction(async (tx) => {
      await expect(new GetUserHandler(tx as PrismaService).handle('missing')).rejects.toThrow(NotFoundException);
    });
  });

  it('rejects a soft-deleted user', async () => {
    await runInTestTransaction(async (tx) => {
      const deleted = await tx.user.create({ data: { email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`, deletedAt: new Date() } });
      await expect(new GetUserHandler(tx as PrismaService).handle(deleted.id)).rejects.toThrow(NotFoundException);
    });
  });
});
