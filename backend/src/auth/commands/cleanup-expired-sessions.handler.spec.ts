import { PrismaService } from '../../database/prisma.service';
import { runInTestTransaction } from '../../test-utils/test-db';
import { CleanupExpiredSessionsHandler } from './cleanup-expired-sessions.handler';

describe('CleanupExpiredSessionsHandler', () => {
  it('deletes only expired sessions and reports the count', async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({ data: { email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com` } });
      const expiredId = `${Date.now()}-${Math.random().toString(36).slice(2)}-expired`;
      await tx.session.create({ data: { userId: user.id, sessionTokenHash: expiredId, expiresAt: new Date(Date.now() - 1000) } });
      const active = await tx.session.create({ data: { userId: user.id, sessionTokenHash: `${Date.now()}-${Math.random().toString(36).slice(2)}-active`, expiresAt: new Date(Date.now() + 60_000) } });
      const result = await new CleanupExpiredSessionsHandler(tx as PrismaService).handle();
      expect(result.count).toBe(1);
      await expect(tx.session.findUnique({ where: { sessionTokenHash: expiredId } })).resolves.toBeNull();
      await expect(tx.session.findUnique({ where: { id: active.id } })).resolves.toMatchObject({ id: active.id });
    });
  });
});
