import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { generateIntegrationTestConfig } from '@/test-utils/test-configuration';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '@/app.module';
import { setupApp } from '@/app.setup';
import { getGarageTestConnection, getIntegrationTestDatabaseUrl, getIntegrationTestS3Bucket } from '@/test-utils/test-db-env';

describe('Cats endpoints', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let prisma: PrismaClient;
  let authAgent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    const databaseUrl = getIntegrationTestDatabaseUrl();
    const s3Bucket = getIntegrationTestS3Bucket();
    const s3 = getGarageTestConnection();
    moduleRef = await Test.createTestingModule({
      imports: [
        AppModule,
        ConfigModule.forRoot({ load: [generateIntegrationTestConfig(
          databaseUrl,
          s3.endpoint,
          s3.accessKey,
          s3.secretAccessKey,
          s3Bucket,
        )], isGlobal: true })],
    }).compile();

    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = await app.resolve(PrismaClient);
    authAgent = await createAuthenticatedAgent(app, prisma);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('POST /api/cats creates a cat card', async () => {
    const location = await createLocation(prisma, 'post');
    const response = await authAgent
      .post('/api/cats')
      .send({
        name: 'Mila',
        sex: 'FEMALE',
        sterilizationStatus: 'STERILIZED',
        currentLocationId: location.id,
      })
      .expect(201);

    expect(response.body.name).toBe('Mila');
    expect(response.body.currentLocationName).toBe(location.name);
    expect(response.body.primaryPhotoUrl).toBeNull();
    expect(response.body.primaryPhotoKey).toBeUndefined();
  });

  it('PUT /api/cats/:id/primary-photo uploads photo data and updates the cat card', async () => {
    const cat = await createCat(prisma, { name: unique('photo') });

    const response = await authAgent
      .put(`/api/cats/${cat.id}/primary-photo`)
      .attach('photo', Buffer.from('fake image bytes'), {
        filename: 'mila portrait.jpg',
        contentType: 'image/jpeg',
      })
      .expect(200);

    expect(response.body.primaryPhotoUrl).toContain(`cats/${cat.id}/photos/`);
    expect(response.body.primaryPhotoUrl).toContain('mila-portrait.jpg');
    expect(response.body.primaryPhotoKey).toBeUndefined();
  });

  it('manages cat gallery photo endpoints', async () => {
    const cat = await createCat(prisma, { name: unique('gallery') });

    const first = await authAgent
      .post(`/api/cats/${cat.id}/photos`)
      .attach('photo', Buffer.from('first image bytes'), {
        filename: 'first.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);
    const second = await authAgent
      .post(`/api/cats/${cat.id}/photos`)
      .attach('photo', Buffer.from('second image bytes'), {
        filename: 'second.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);

    expect(first.body.isPrimary).toBe(true);
    expect(second.body.isPrimary).toBe(false);

    const list = await authAgent
      .get(`/api/cats/${cat.id}/photos`)
      .expect(200);
    expect(list.body).toHaveLength(2);

    const primary = await authAgent
      .put(`/api/cats/${cat.id}/photos/${second.body.id}/primary`)
      .expect(200);
    expect(primary.body.primaryPhotoUrl).toContain('second.jpg');

    const afterDelete = await authAgent
      .delete(`/api/cats/${cat.id}/photos/${second.body.id}`)
      .expect(200);
    expect(afterDelete.body.primaryPhotoUrl).toContain('first.jpg');
  });

  it('GET /api/cats lists active cat cards with filters', async () => {
    const location = await createLocation(prisma, 'list');
    const prefix = unique('list');
    await createCat(prisma, { name: `${prefix} Mila`, currentLocationId: location.id, microchipNumber: `${prefix}-chip` });
    await createCat(prisma, { name: `${prefix} Archive`, currentLocationId: location.id, status: 'ARCHIVED' });

    const response = await authAgent
      .get('/api/cats')
      .query({ locationId: location.id, search: prefix, limit: 50 })
      .expect(200);

    expect(response.body.total).toBe(1);
    expect(response.body.data[0].name).toContain('Mila');
  });

  it('GET /api/cats/:id/card returns one cat card', async () => {
    const cat = await createCat(prisma, { name: unique('card') });

    const response = await authAgent
      .get(`/api/cats/${cat.id}/card`)
      .expect(200);

    expect(response.body.id).toBe(cat.id);
    expect(response.body.primaryPhotoUrl).toBeNull();
  });

  it('PATCH /api/cats/:id updates a cat card', async () => {
    const cat = await createCat(prisma, { name: unique('patch') });

    const response = await authAgent
      .patch(`/api/cats/${cat.id}`)
      .send({ name: 'Updated cat', status: 'ADOPTED' })
      .expect(200);

    expect(response.body.name).toBe('Updated cat');
    expect(response.body.status).toBe('ADOPTED');
  });

  it('manages cat weight history endpoints', async () => {
    const cat = await createCat(prisma, { name: unique('weight') });

    const created = await authAgent
      .post(`/api/cats/${cat.id}/weights`)
      .send({ weightKg: 3.8, measuredAt: '2026-07-30' })
      .expect(201);

    expect(created.body.weightKg).toBe(3.8);
    expect(created.body.measuredAt).toContain('2026-07-30');

    const list = await authAgent
      .get(`/api/cats/${cat.id}/weights`)
      .expect(200);

    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(created.body.id);

    await authAgent
      .delete(`/api/cats/${cat.id}/weights/${created.body.id}`)
      .expect(204);

    await authAgent
      .delete(`/api/cats/${cat.id}/weights/${created.body.id}`)
      .expect(404);
  });

  it('manages cat tags and filters cat cards by tag', async () => {
    const cat = await createCat(prisma, { name: unique('tagged') });
    await createCat(prisma, { name: unique('untagged') });

    const createdTag = await authAgent
      .post('/api/cats/tags')
      .send({ name: unique('tag'), color: '#8ecaff' })
      .expect(201);

    expect(createdTag.body.color).toBe('#8ecaff');

    const renamedTag = await authAgent
      .patch(`/api/cats/tags/${createdTag.body.id}`)
      .send({ color: '#ffd166' })
      .expect(200);

    expect(renamedTag.body.color).toBe('#ffd166');

    const taggedCat = await authAgent
      .post(`/api/cats/${cat.id}/tags/${createdTag.body.id}`)
      .expect(201);

    expect(taggedCat.body.tags).toEqual([{ id: createdTag.body.id, name: createdTag.body.name, color: '#ffd166' }]);

    const list = await authAgent
      .get('/api/cats')
      .query({ tagId: createdTag.body.id })
      .expect(200);

    expect(list.body.data.map((item: { id: string }) => item.id)).toEqual([cat.id]);

    await authAgent
      .delete(`/api/cats/tags/${createdTag.body.id}`)
      .expect(409);

    await authAgent
      .delete(`/api/cats/${cat.id}/tags/${createdTag.body.id}`)
      .expect(200);

    await authAgent
      .delete(`/api/cats/tags/${createdTag.body.id}`)
      .expect(204);
  });

  it('returns validation and not found errors', async () => {
    await authAgent.get('/api/cats').query({ limit: 101 }).expect(400);
    await authAgent.get('/api/cats/missing/card').expect(404);
    await authAgent.put('/api/cats/missing/primary-photo').expect(404);
    await authAgent.post('/api/cats').send({
      name: 'Invalid Photo Field Cat',
      sex: 'UNKNOWN',
      sterilizationStatus: 'UNKNOWN',
      primaryPhotoKey: 'cats/not-allowed.jpg',
    }).expect(400);
  });
});

function unique(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function createAuthenticatedAgent(app: INestApplication, prisma: PrismaClient) {
  const email = `${unique('cats-auth')}@example.com`;
  const password = 'cats-integration-password';
  const passwordHash = await bcrypt.hash(password, 10);
  
  await prisma.user.create({
    data: {
      email,
      fullName: 'Cats Integration User',
      role: 'STAFF',
      status: 'ACTIVE',
      passwordHash,
    },
  });

  const agent = request.agent(app.getHttpServer());
  await agent
    .post('/auth/login')
    .send({ email, password })
    .expect(201);

  return agent;
}

async function createLocation(prisma: PrismaClient, prefix: string) {
  return (prisma as any).location.create({
    data: { name: unique(`endpoint-${prefix}`), status: 'ACTIVE' },
  });
}

async function createCat(
  prisma: PrismaClient,
  data: { name: string; currentLocationId?: string; microchipNumber?: string; status?: string },
) {
  return (prisma as any).cat.create({
    data: {
      name: data.name,
      sex: 'UNKNOWN',
      sterilizationStatus: 'UNKNOWN',
      currentLocationId: data.currentLocationId ?? null,
      microchipNumber: data.microchipNumber ?? null,
      status: data.status ?? 'ACTIVE',
    },
  });
}
