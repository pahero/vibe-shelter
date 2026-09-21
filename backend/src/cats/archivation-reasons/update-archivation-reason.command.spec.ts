import { PrismaService } from '../../database/prisma.service';
import { runInTestTransaction } from '../../test-utils/test-db';
import { UpdateArchivationReasonCommand } from './update-archivation-reason.command';

describe('UpdateArchivationReasonCommand', () => {
  it('updates and audits an active archivation reason', async () => {
    await runInTestTransaction(async (tx) => {
      const command = new UpdateArchivationReasonCommand(tx as PrismaService);
      const actor = await tx.user.create({ data: { email: `${Date.now()}-${Math.random()}@example.com`, status: 'ACTIVE' } });
      const reason = await tx.catArchivationReason.create({ data: { name: `Before ${Date.now()}-${Math.random()}` } });
      const name = `Adopted in GB ${Date.now()}-${Math.random()}`;
      const updated = await command.execute(reason.id, name, actor.id);

      expect(updated).toEqual({ id: reason.id });
      await expect(tx.catArchivationReasonAuditEvent.findFirstOrThrow({ where: { reasonId: reason.id } })).resolves.toMatchObject({
        action: 'update', actorUserId: actor.id, oldValue: reason.name, newValue: name,
      });
    });
  });
});
