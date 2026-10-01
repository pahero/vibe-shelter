import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { runInTestTransaction } from '../../test-utils/test-db';
import { CreateCatTagHandler } from './create-cat-tag.handler';

describe('CreateCatTagHandler', () => {
  it('creates a normalized tag and value-free audit row', async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({ data: { email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com` } });
      const result = await new CreateCatTagHandler(tx as PrismaService).handle({ name: '  Foster  ', color: '#8ecaff' }, actor.id);
      expect(result).toMatchObject({ name: 'Foster', color: '#8ecaff' });
      await expect(tx.tagAuditEvent.findFirstOrThrow({ where: { tagId: result.id } })).resolves.toMatchObject({ action: 'create', oldValue: null, newValue: null });
    });
  });

  it('reuses an existing active tag of the same name', async () => {
    await runInTestTransaction(async (tx) => {
      const tag = await tx.catTag.create({ data: { name: 'Existing' } });
      const result = await new CreateCatTagHandler(tx as PrismaService).handle({ name: ' Existing ' });
      expect(result.id).toBe(tag.id);
    });
  });

  it('allows reusing a soft-deleted tag name', async () => {
    await runInTestTransaction(async (tx) => {
      const tag = await tx.catTag.create({ data: { name: 'Reusable', deletedAt: new Date() } });
      const result = await new CreateCatTagHandler(tx as PrismaService).handle({ name: tag.name });
      expect(result.id).not.toBe(tag.id);
      expect(result.color).toBe('#ffb38a');
    });
  });

  it('rejects a blank tag name', async () => {
    await runInTestTransaction(async (tx) => {
      await expect(new CreateCatTagHandler(tx as PrismaService).handle({ name: ' ' })).rejects.toThrow(BadRequestException);
    });
  });

  it('rejects a disallowed tag color', async () => {
    await runInTestTransaction(async (tx) => {
      await expect(new CreateCatTagHandler(tx as PrismaService).handle({ name: 'Tag', color: '#123456' })).rejects.toThrow(BadRequestException);
    });
  });
});
