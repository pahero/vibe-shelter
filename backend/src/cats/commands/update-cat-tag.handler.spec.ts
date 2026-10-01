import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { runInTestTransaction } from '../../test-utils/test-db';
import { UpdateCatTagHandler } from './update-cat-tag.handler';

describe('UpdateCatTagHandler', () => {
  it('updates name and color and emits one scalar audit event per changed field', async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({ data: { email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com` } });
      const tag = await tx.catTag.create({ data: { name: `Before ${Date.now()}-${Math.random().toString(36).slice(2)}`, color: '#8ecaff' } });
      const result = await new UpdateCatTagHandler(tx as PrismaService).handle(tag.id, { name: 'After', color: '#ffd166' }, actor.id);
      expect(result).toMatchObject({ name: 'After', color: '#ffd166' });
      const events = await tx.tagAuditEvent.findMany({ where: { tagId: tag.id } });
      expect(events).toHaveLength(2);
      expect(events).toEqual(expect.arrayContaining([
        expect.objectContaining({ action: 'name_changed', oldValue: tag.name, newValue: 'After' }),
        expect.objectContaining({ action: 'color_changed', oldValue: '#8ecaff', newValue: '#ffd166' }),
      ]));
    });
  });

  it('requires at least one field', async () => {
    await runInTestTransaction(async (tx) => {
      await expect(new UpdateCatTagHandler(tx as PrismaService).handle('tag-id', {})).rejects.toThrow(BadRequestException);
    });
  });

  it('rejects missing tags', async () => {
    await runInTestTransaction(async (tx) => {
      await expect(new UpdateCatTagHandler(tx as PrismaService).handle('missing', { color: '#8ecaff' })).rejects.toThrow(NotFoundException);
    });
  });

  it('rejects a duplicate active tag name', async () => {
    await runInTestTransaction(async (tx) => {
      await tx.catTag.create({ data: { name: 'Taken' } });
      const target = await tx.catTag.create({ data: { name: 'Target' } });
      await expect(new UpdateCatTagHandler(tx as PrismaService).handle(target.id, { name: 'Taken' })).rejects.toThrow(ConflictException);
    });
  });
});
