import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '@/app.module';
import { setupApp } from '@/app.setup';
import { generateIntegrationTestConfig } from '@/test-utils/test-configuration';
import { getGarageTestConnection, getIntegrationTestDatabaseUrl, getIntegrationTestS3Bucket } from '@/test-utils/test-db-env';

describe('Authentication endpoints', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const databaseUrl = getIntegrationTestDatabaseUrl();
    const bucket = getIntegrationTestS3Bucket();
    const s3 = getGarageTestConnection();
    moduleRef = await Test.createTestingModule({
      imports: [
        AppModule,
        ConfigModule.forRoot({
          load: [generateIntegrationTestConfig(databaseUrl, s3.endpoint, s3.accessKey, s3.secretAccessKey, bucket)],
          isGlobal: true,
        }),
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = await app.resolve(PrismaClient);
  });

  afterAll(async () => {
    await app?.close();
    await moduleRef?.close();
  });

  it('logs in, returns the current user, refreshes the session, changes the password, and logs out', async () => {
    const email = `${unique()}@example.com`;
    const oldPassword = 'InitialPassword123!';
    const user = await prisma.user.create({
      data: {
        email,
        fullName: 'Auth Integration User',
        status: 'ACTIVE',
        passwordHash: await bcrypt.hash(oldPassword, 10),
      },
    });
    const agent = request.agent(app.getHttpServer());
    const login = await agent.post('/auth/login').send({ email, password: oldPassword }).expect(201);
    expect(login.body).toMatchObject({ id: user.id, email, passwordChangeRequired: false });
    await agent.get('/auth/me').expect(200).expect(({ body }) => expect(body.id).toBe(user.id));
    await agent.post('/auth/session/refresh').expect(201).expect(({ body }) => expect(body).toEqual({ message: 'Session refreshed' }));
    await agent.post('/auth/change-password').send({
      currentPassword: oldPassword,
      newPassword: 'ReplacementPassword123!',
      newPasswordConfirmation: 'ReplacementPassword123!',
    }).expect(201).expect(({ body }) => expect(body).toEqual({ id: user.id }));
    await agent.post('/auth/logout').expect(200);
    await agent.get('/auth/me').expect(401);

    const newAgent = request.agent(app.getHttpServer());
    await newAgent.post('/auth/login').send({ email, password: 'ReplacementPassword123!' }).expect(201);
  });

  it('replaces a temporary password before granting normal access', async () => {
    const email = `${unique()}@example.com`;
    const password = 'TemporaryPassword123!';
    const user = await prisma.user.create({
      data: {
        email,
        status: 'ACTIVE',
        passwordHash: await bcrypt.hash(password, 10),
        passwordChangeRequired: true,
      },
    });
    const agent = request.agent(app.getHttpServer());
    const login = await agent.post('/auth/login').send({ email, password }).expect(201);
    expect(login.body.passwordChangeRequired).toBe(true);
    await agent.post('/auth/replace-temporary-password').send({
      newPassword: 'PermanentPassword123!',
      newPasswordConfirmation: 'PermanentPassword123!',
    }).expect(201).expect(({ body }) => expect(body).toEqual({ id: user.id }));
    await expect(prisma.user.findUniqueOrThrow({ where: { id: user.id } })).resolves.toMatchObject({ passwordChangeRequired: false });
  });

  it('rejects invalid credentials and mismatched password confirmations', async () => {
    const email = `${unique()}@example.com`;
    const user = await prisma.user.create({
      data: { email, status: 'ACTIVE', passwordHash: await bcrypt.hash('Password123!', 10) },
    });
    const agent = request.agent(app.getHttpServer());
    await agent.post('/auth/login').send({ email, password: 'incorrect' }).expect(401);
    await agent.post('/auth/login').send({ email, password: 'Password123!' }).expect(201);
    await agent.post('/auth/change-password').send({
      currentPassword: 'Password123!',
      newPassword: 'NewPassword123!',
      newPasswordConfirmation: 'DifferentPassword123!',
    }).expect(400);
    await agent.post('/auth/replace-temporary-password').send({
      newPassword: 'NewPassword123!',
      newPasswordConfirmation: 'DifferentPassword123!',
    }).expect(400);
    await expect(prisma.user.findUniqueOrThrow({ where: { id: user.id } })).resolves.toMatchObject({ passwordChangeRequired: false });
  });

  it('starts Google OAuth with a redirect', async () => {
    const response = await request(app.getHttpServer()).get('/auth/google').expect(302);
    expect(response.headers.location).toContain('accounts.google.com');
  });
});

function unique(): string {
  return `auth-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
