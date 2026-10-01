import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { runInTestTransaction } from '../../test-utils/test-db';
import { CreateSessionHandler } from './create-session.handler';

describe('CreateSessionHandler', () => {
  it('creates a session and updates last login within one transaction', async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({ data: { email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com` } });
      const config = new ConfigService();
      config.set('sessionTtlMs', 60_000);
      const result = await new CreateSessionHandler(tx as PrismaService, config).handle(user.id, 'agent', '127.0.0.1');
      const session = await tx.session.findUniqueOrThrow({ where: { id: result.id } });
      expect(session).toMatchObject({ userId: user.id, userAgent: 'agent', ipAddress: '127.0.0.1' });
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
      await expect(tx.user.findUniqueOrThrow({ where: { id: user.id } })).resolves.toMatchObject({ lastLoginAt: expect.any(Date), version: 1 });
    });
  });

  it('rejects a missing user without creating a session', async () => {
    await runInTestTransaction(async (tx) => {
      await expect(new CreateSessionHandler(tx as PrismaService, new ConfigService()).handle('missing')).rejects.toThrow(NotFoundException);
      expect(await tx.session.count({ where: { userId: 'missing' } })).toBe(0);
    });
  });

  it('rejects an inactive user without creating a session', async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({ data: { email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`, status: 'INACTIVE' } });
      await expect(new CreateSessionHandler(tx as PrismaService, new ConfigService()).handle(user.id)).rejects.toThrow('User account is inactive');
      expect(await tx.session.count({ where: { userId: user.id } })).toBe(0);
    });
  });
});
