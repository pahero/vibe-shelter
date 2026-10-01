import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { runInTestTransaction } from '../../test-utils/test-db';
import { DeleteUserHandler } from './delete-user.handler';

describe('DeleteUserHandler', () => {
  it('soft-deletes the user, advances the token, and revokes active sessions', async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({ data: { email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com` } });
      const session = await tx.session.create({ data: { userId: user.id, sessionTokenHash: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}-token`, expiresAt: new Date(Date.now() + 60_000) } });
      await new DeleteUserHandler(tx as PrismaService).handle(user.id);
      await expect(tx.user.findUniqueOrThrow({ where: { id: user.id } })).resolves.toMatchObject({ deletedAt: expect.any(Date), status: 'INACTIVE', version: 1 });
      await expect(tx.session.findUniqueOrThrow({ where: { id: session.id } })).resolves.toMatchObject({ revokedAt: expect.any(Date) });
    });
  });

  it('rejects a missing user', async () => {
    await runInTestTransaction(async (tx) => {
      await expect(new DeleteUserHandler(tx as PrismaService).handle('missing')).rejects.toThrow(NotFoundException);
    });
  });

  it('rejects an already deleted user', async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({ data: { email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`, deletedAt: new Date() } });
      await expect(new DeleteUserHandler(tx as PrismaService).handle(user.id)).rejects.toThrow(NotFoundException);
    });
  });
});
