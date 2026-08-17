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

describe('Admin user registration endpoints', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let prisma: PrismaClient;
  let adminAgent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    const databaseUrl = getIntegrationTestDatabaseUrl();
    const s3Bucket = getIntegrationTestS3Bucket();
    const s3 = getGarageTestConnection();
    moduleRef = await Test.createTestingModule({
      imports: [
        AppModule,
        ConfigModule.forRoot({
          load: [generateIntegrationTestConfig(databaseUrl, s3.endpoint, s3.accessKey, s3.secretAccessKey, s3Bucket)],
          isGlobal: true,
        }),
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = await app.resolve(PrismaClient);
    adminAgent = await createAdminAgent(app, prisma);
  });

  afterAll(async () => {
    await app?.close();
    await moduleRef?.close();
  });

  it('POST /admin/users creates users with isTest and hides password data', async () => {
    const testEmail = `${unique('test-user')}@example.com`;
    const realEmail = `${unique('real-user')}@example.com`;

    const testResponse = await adminAgent
      .post('/admin/users')
      .send({
        email: testEmail,
        fullName: 'Test User',
        role: 'staff',
        status: 'active',
        password: 'Password123!',
        isTest: true,
      })
      .expect(201);
    const realResponse = await adminAgent
      .post('/admin/users')
      .send({
        email: realEmail,
        fullName: 'Real User',
        role: 'staff',
        status: 'active',
        password: 'Password123!',
        isTest: false,
      })
      .expect(201);

    expect(testResponse.body).toMatchObject({ email: testEmail, isTest: true });
    expect(realResponse.body).toMatchObject({ email: realEmail, isTest: false });
    expect(testResponse.body.password).toBeUndefined();
    expect(testResponse.body.passwordHash).toBeUndefined();

    const stored = await prisma.user.findUniqueOrThrow({ where: { email: testEmail } });
    expect(stored.isTest).toBe(true);
    expect(stored.passwordHash).toBeTruthy();
  });

  it('POST /admin/users rejects missing and blank password without creating a user', async () => {
    const missingEmail = `${unique('missing-password')}@example.com`;
    const blankEmail = `${unique('blank-password')}@example.com`;

    await adminAgent
      .post('/admin/users')
      .send({ email: missingEmail, role: 'staff', status: 'active', isTest: false })
      .expect(400);
    await adminAgent
      .post('/admin/users')
      .send({ email: blankEmail, role: 'staff', status: 'active', password: '        ', isTest: false })
      .expect(400);

    await expect(prisma.user.findUnique({ where: { email: missingEmail } })).resolves.toBeNull();
    await expect(prisma.user.findUnique({ where: { email: blankEmail } })).resolves.toBeNull();
  });

  it('lists and fetches users with isTest marker', async () => {
    const email = `${unique('listed-user')}@example.com`;
    const created = await prisma.user.create({
      data: {
        email,
        fullName: 'Listed User',
        role: 'STAFF',
        status: 'ACTIVE',
        passwordHash: await bcrypt.hash('Password123!', 10),
        isTest: true,
      },
    });

    const list = await adminAgent.get('/admin/users').expect(200);
    expect(list.body).toEqual(expect.arrayContaining([expect.objectContaining({ email, isTest: true })]));

    const detail = await adminAgent.get(`/admin/users/${created.id}`).expect(200);
    expect(detail.body).toMatchObject({ email, isTest: true });

    const userList = await adminAgent.get('/users').expect(200);
    expect(userList.body).toEqual(expect.arrayContaining([expect.objectContaining({ email, isTest: true })]));

    const userDetail = await adminAgent.get(`/users/${created.id}`).expect(200);
    expect(userDetail.body).toMatchObject({ email, isTest: true });
  });
});

function unique(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function createAdminAgent(app: INestApplication, prisma: PrismaClient): Promise<ReturnType<typeof request.agent>> {
  const email = `${unique('admin-auth')}@example.com`;
  const password = 'admin-integration-password';
  await prisma.user.create({
    data: {
      email,
      fullName: 'Admin Integration User',
      role: 'ADMIN',
      status: 'ACTIVE',
      passwordHash: await bcrypt.hash(password, 10),
      isTest: false,
    },
  });

  const agent = request.agent(app.getHttpServer());
  await agent.post('/auth/login').send({ email, password }).expect(201);
  return agent;
}
