import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { runInTestTransaction } from '../../test-utils/test-db';
import { CreateArchivationReasonCommand } from './create-archivation-reason.command';

describe('CreateArchivationReasonCommand', () => {
  it('creates and audits an archivation reason', async () => {
    await runInTestTransaction(async (tx) => {
      const command = new CreateArchivationReasonCommand(tx as PrismaService);
      const actor = await tx.user.create({ data: { email: `${Date.now()}-${Math.random()}@example.com`, status: 'ACTIVE' } });
      const name = `Adopted in CY ${Date.now()}-${Math.random()}`;
      const reason = await command.execute(name, actor.id);

      expect(reason).toEqual({ id: expect.any(String) });
      await expect(tx.catArchivationReasonAuditEvent.findFirstOrThrow({ where: { reasonId: reason.id } })).resolves.toMatchObject({
        action: 'create', actorUserId: actor.id, oldValue: null, newValue: name,
      });
    });
  });

  it('rejects an active duplicate name', async () => {
    await runInTestTransaction(async (tx) => {
      const command = new CreateArchivationReasonCommand(tx as PrismaService);
      const actor = await tx.user.create({ data: { email: `${Date.now()}-${Math.random()}@example.com`, status: 'ACTIVE' } });
      const name = `Duplicate reason ${Date.now()}-${Math.random()}`;
      await tx.catArchivationReason.create({ data: { name } });

      await expect(command.execute(name, actor.id)).rejects.toThrow(ConflictException);
    });
  });
});
