import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Profile } from 'passport-google-oauth20';
import { PrismaService } from '../../database/prisma.service';
import { runInTestTransaction } from '../../test-utils/test-db';
import { ValidateGoogleProfileHandler } from './validate-google-profile.handler';

describe('ValidateGoogleProfileHandler', () => {
  it('validates domain and returns an active user', async () => {
    await runInTestTransaction(async (tx) => {
      const email = `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`;
      const user = await tx.user.create({ data: { email } });
      const config = new ConfigService();
      config.set('allowedGoogleDomain', 'example.com');
      const [localPart, domain] = email.split('@');
      const profile = { emails: [{ value: `${localPart.toUpperCase()}@${domain}` }] } as Profile;
      await expect(new ValidateGoogleProfileHandler(tx as PrismaService, config).handle(profile)).resolves.toMatchObject({ id: user.id });
    });
  });

  it('rejects a profile without email', async () => {
    await runInTestTransaction(async (tx) => {
      await expect(new ValidateGoogleProfileHandler(tx as PrismaService, new ConfigService()).handle({ emails: [] } as unknown as Profile)).rejects.toThrow(BadRequestException);
    });
  });

  it('rejects an email outside the configured domain', async () => {
    await runInTestTransaction(async (tx) => {
      const config = new ConfigService();
      config.set('allowedGoogleDomain', 'example.com');
      const profile = { emails: [{ value: 'user@wrong.test' }] } as Profile;
      await expect(new ValidateGoogleProfileHandler(tx as PrismaService, config).handle(profile)).rejects.toThrow(UnauthorizedException);
    });
  });

  it('rejects an inactive user', async () => {
    await runInTestTransaction(async (tx) => {
      const email = `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`;
      const config = new ConfigService();
      await tx.user.create({ data: { email, status: 'INACTIVE' } });
      await expect(new ValidateGoogleProfileHandler(tx as PrismaService, config).handle({ emails: [{ value: email }] } as Profile)).rejects.toThrow(UnauthorizedException);
    });
  });

  it('rejects an unknown user', async () => {
    await runInTestTransaction(async (tx) => {
      await expect(new ValidateGoogleProfileHandler(tx as PrismaService, new ConfigService()).handle({ emails: [{ value: 'missing@example.com' }] } as Profile)).rejects.toThrow(UnauthorizedException);
    });
  });
});
