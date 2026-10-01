import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { runInTestTransaction } from '../../test-utils/test-db';
import { ValidateSessionHandler } from './validate-session.handler';

describe('ValidateSessionHandler', () => {
  it('returns an active unexpired session and its user', async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({ data: { email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com` } });
      const session = await tx.session.create({ data: { userId: user.id, sessionTokenHash: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}-token`, expiresAt: new Date(Date.now() + 60_000) } });
      await expect(new ValidateSessionHandler(tx as PrismaService).handle(session.id)).resolves.toMatchObject({ id: session.id, user: { id: user.id } });
    });
  });

  it('rejects a missing session', async () => {
    await runInTestTransaction(async (tx) => {
      await expect(new ValidateSessionHandler(tx as PrismaService).handle('missing')).rejects.toThrow('Session not found');
    });
  });

  it('rejects revoked sessions', async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({ data: { email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com` } });
      const session = await tx.session.create({ data: { userId: user.id, sessionTokenHash: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}-token`, expiresAt: new Date(Date.now() + 60_000), revokedAt: new Date() } });
      await expect(new ValidateSessionHandler(tx as PrismaService).handle(session.id)).rejects.toThrow('Session has been revoked');
    });
  });

  it('rejects expired sessions', async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({ data: { email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com` } });
      const session = await tx.session.create({ data: { userId: user.id, sessionTokenHash: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}-token`, expiresAt: new Date(Date.now() - 1) } });
      await expect(new ValidateSessionHandler(tx as PrismaService).handle(session.id)).rejects.toThrow('Session expired');
    });
  });

  it('rejects sessions whose users are inactive', async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({ data: { email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`, status: 'INACTIVE' } });
      const session = await tx.session.create({ data: { userId: user.id, sessionTokenHash: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}-token`, expiresAt: new Date(Date.now() + 60_000) } });
      await expect(new ValidateSessionHandler(tx as PrismaService).handle(session.id)).rejects.toThrow('User is inactive');
    });
  });

  it('rejects sessions whose users are soft-deleted', async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({ data: { email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`, deletedAt: new Date() } });
      const session = await tx.session.create({ data: { userId: user.id, sessionTokenHash: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}-token`, expiresAt: new Date(Date.now() + 60_000) } });
      await expect(new ValidateSessionHandler(tx as PrismaService).handle(session.id)).rejects.toThrow('User is inactive');
    });
  });
});
