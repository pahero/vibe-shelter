import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { runInTestTransaction } from '../../test-utils/test-db';
import { ValidatePasswordCredentialsHandler } from './validate-password-credentials.handler';

describe('ValidatePasswordCredentialsHandler', () => {
  it('returns an active user with matching password', async () => {
    await runInTestTransaction(async (tx) => {
      const passwordHash = await bcrypt.hash('Password123!', 10);
      const user = await tx.user.create({ data: { email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`, passwordHash } });
      await expect(new ValidatePasswordCredentialsHandler(tx as PrismaService).handle(user.email.toUpperCase(), 'Password123!')).resolves.toMatchObject({ id: user.id });
    });
  });

  it('uses the invalid-credentials response for a missing user', async () => {
    await runInTestTransaction(async (tx) => {
      await expect(new ValidatePasswordCredentialsHandler(tx as PrismaService).handle('missing@example.com', 'anything')).rejects.toThrow('Invalid email or password');
    });
  });

  it('rejects inactive users', async () => {
    await runInTestTransaction(async (tx) => {
      const email = `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`;
      await tx.user.create({ data: { email, status: 'INACTIVE', passwordHash: await bcrypt.hash('Password123!', 10) } });
      await expect(new ValidatePasswordCredentialsHandler(tx as PrismaService).handle(email, 'Password123!')).rejects.toThrow(UnauthorizedException);
    });
  });

  it('rejects accounts without password login', async () => {
    await runInTestTransaction(async (tx) => {
      const email = `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`;
      await tx.user.create({ data: { email } });
      await expect(new ValidatePasswordCredentialsHandler(tx as PrismaService).handle(email, 'Password123!')).rejects.toThrow('Password login is not enabled');
    });
  });

  it('rejects an incorrect password', async () => {
    await runInTestTransaction(async (tx) => {
      const email = `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`;
      await tx.user.create({ data: { email, passwordHash: await bcrypt.hash('CorrectPassword!', 10) } });
      await expect(new ValidatePasswordCredentialsHandler(tx as PrismaService).handle(email, 'WrongPassword!')).rejects.toThrow('Invalid email or password');
    });
  });
});
