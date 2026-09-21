import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { runInTestTransaction } from '../../test-utils/test-db';
import { DeleteArchivationReasonCommand } from './delete-archivation-reason.command';

describe('DeleteArchivationReasonCommand', () => {
  it('soft deletes and audits an unused archivation reason', async () => {
    await runInTestTransaction(async (tx) => {
      const command = new DeleteArchivationReasonCommand(tx as PrismaService);
      const actor = await tx.user.create({ data: { email: `${Date.now()}-${Math.random()}@example.com`, status: 'ACTIVE' } });
      const reason = await tx.catArchivationReason.create({ data: { name: `Unused ${Date.now()}-${Math.random()}` } });
      await command.execute(reason.id, actor.id);

      await expect(tx.catArchivationReason.findUniqueOrThrow({ where: { id: reason.id } })).resolves.toMatchObject({ deletedAt: expect.any(Date) });
      await expect(tx.catArchivationReasonAuditEvent.findFirstOrThrow({ where: { reasonId: reason.id } })).resolves.toMatchObject({
        action: 'delete', actorUserId: actor.id, oldValue: reason.name, newValue: null,
      });
    });
  });

  it('does not delete a reason used by a cat', async () => {
    await runInTestTransaction(async (tx) => {
      const command = new DeleteArchivationReasonCommand(tx as PrismaService);
      const actor = await tx.user.create({ data: { email: `${Date.now()}-${Math.random()}@example.com`, status: 'ACTIVE' } });
      const reason = await tx.catArchivationReason.create({ data: { name: `Used ${Date.now()}-${Math.random()}` } });
      await tx.cat.create({ data: { name: `Archived ${Date.now()}-${Math.random()}`, status: 'ARCHIVED', archivationReasonId: reason.id } });

      await expect(command.execute(reason.id, actor.id)).rejects.toThrow(ConflictException);
    });
  });
});
