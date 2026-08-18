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
  let authUser: { id: string; email: string; isTest: boolean };

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
    const auth = await createAuthenticatedAgent(app, prisma);
    authAgent = auth.agent;
    authUser = auth.user;
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
    const stored = await (prisma as any).cat.findUnique({ where: { id: response.body.id } });
    expect(stored.createdByUserId).toBe(authUser.id);
    expect(response.body.isTest).toBe(false);
    expect(stored.isTest).toBe(false);
  });

  it('isolates cats and locations by authenticated user test status', async () => {
    const regularAuth = await createAuthenticatedAgent(app, prisma, false);
    const testAuth = await createAuthenticatedAgent(app, prisma, true);

    const regularLocation = await regularAuth.agent
      .post('/api/locations')
      .send({ name: unique('regular-location'), ownerId: regularAuth.user.id })
      .expect(201);
    const testLocation = await testAuth.agent
      .post('/api/locations')
      .send({ name: unique('test-location'), ownerId: regularAuth.user.id })
      .expect(201);

    expect(regularLocation.body.isTest).toBe(false);
    expect(testLocation.body.isTest).toBe(true);

    const regularCat = await regularAuth.agent.post('/api/cats').send({
      name: unique('regular-cat'),
      sex: 'UNKNOWN',
      sterilizationStatus: 'UNKNOWN',
      currentLocationId: regularLocation.body.id,
    }).expect(201);
    const testCat = await testAuth.agent.post('/api/cats').send({
      name: unique('test-cat'),
      sex: 'UNKNOWN',
      sterilizationStatus: 'UNKNOWN',
      currentLocationId: testLocation.body.id,
    }).expect(201);

    expect(regularCat.body.isTest).toBe(false);
    expect(testCat.body.isTest).toBe(true);

    const regularLocations = await regularAuth.agent.get('/api/locations').query({ ownerId: regularAuth.user.id }).expect(200);
    const testLocations = await testAuth.agent.get('/api/locations').query({ ownerId: regularAuth.user.id }).expect(200);
    expect(regularLocations.body.data.map((location: { id: string }) => location.id)).toContain(regularLocation.body.id);
    expect(regularLocations.body.data.map((location: { id: string }) => location.id)).not.toContain(testLocation.body.id);
    expect(testLocations.body.data.map((location: { id: string }) => location.id)).toContain(testLocation.body.id);
    expect(testLocations.body.data.map((location: { id: string }) => location.id)).not.toContain(regularLocation.body.id);

    const regularCats = await regularAuth.agent.get('/api/cats').query({ search: 'regular-cat' }).expect(200);
    const testCats = await testAuth.agent.get('/api/cats').query({ search: 'test-cat' }).expect(200);
    expect(regularCats.body.data.map((cat: { id: string }) => cat.id)).toContain(regularCat.body.id);
    expect(regularCats.body.data.map((cat: { id: string }) => cat.id)).not.toContain(testCat.body.id);
    expect(testCats.body.data.map((cat: { id: string }) => cat.id)).toContain(testCat.body.id);
    expect(testCats.body.data.map((cat: { id: string }) => cat.id)).not.toContain(regularCat.body.id);

    await regularAuth.agent.get(`/api/locations/${testLocation.body.id}`).expect(404);
    await testAuth.agent.get(`/api/cats/${regularCat.body.id}/card`).expect(404);
    await regularAuth.agent.patch(`/api/cats/${regularCat.body.id}`).send({ currentLocationId: testLocation.body.id }).expect(404);
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

    const history = await authAgent.get(`/api/cats/${cat.id}/history`).expect(200);
    expect(history.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ eventType: 'name_changed', oldValue: cat.name, newValue: 'Updated cat' }),
      expect.objectContaining({ eventType: 'status_changed', oldValue: 'ACTIVE', newValue: 'ADOPTED' }),
    ]));
    expect(history.body.data[0].actor).toMatchObject({ id: authUser.id, email: authUser.email });
  });

  it('preserves creator attribution when another user updates a cat', async () => {
    const location = await createLocation(prisma, 'creator');
    const created = await authAgent.post('/api/cats').send({
      name: unique('creator-cat'),
      sex: 'UNKNOWN',
      sterilizationStatus: 'UNKNOWN',
      currentLocationId: location.id,
    }).expect(201);
    const otherAuth = await createAuthenticatedAgent(app, prisma);

    await otherAuth.agent.patch(`/api/cats/${created.body.id}`).send({ name: 'Updated by second user' }).expect(200);

    const stored = await (prisma as any).cat.findUnique({ where: { id: created.body.id } });
    expect(stored.createdByUserId).toBe(authUser.id);
  });

  it('returns newest-first multi-user history and suppresses no-op history', async () => {
    const cat = await createCat(prisma, { name: unique('history-order') });
    const otherAuth = await createAuthenticatedAgent(app, prisma);

    await authAgent.patch(`/api/cats/${cat.id}`).send({ name: 'First history name' }).expect(200);
    await otherAuth.agent.patch(`/api/cats/${cat.id}`).send({ name: 'Second history name' }).expect(200);
    await otherAuth.agent.patch(`/api/cats/${cat.id}`).send({ name: 'Second history name' }).expect(200);

    const history = await authAgent.get(`/api/cats/${cat.id}/history`).expect(200);
    expect(history.body.total).toBe(2);
    expect(history.body.data.map((event: any) => event.newValue)).toEqual(['Second history name', 'First history name']);
    expect(history.body.data[0].actor.id).toBe(otherAuth.user.id);
  });

  it('returns photo history links while excluding deleted photos from active gallery', async () => {
    const cat = await createCat(prisma, { name: unique('photo-history') });

    const created = await authAgent
      .post(`/api/cats/${cat.id}/photos`)
      .attach('photo', Buffer.from('history image bytes'), { filename: 'history.jpg', contentType: 'image/jpeg' })
      .expect(201);
    await authAgent.delete(`/api/cats/${cat.id}/photos/${created.body.id}`).expect(200);

    const photos = await authAgent.get(`/api/cats/${cat.id}/photos`).expect(200);
    expect(photos.body).toHaveLength(0);
    const history = await authAgent.get(`/api/cats/${cat.id}/history`).expect(200);
    expect(history.body.data.map((event: any) => event.eventType)).toEqual(['photo_deleted', 'photo_created']);
    expect(history.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ eventType: 'photo_created', photo: expect.objectContaining({ id: created.body.id, status: 'DELETED', link: expect.stringContaining('history.jpg') }) }),
      expect.objectContaining({ eventType: 'photo_deleted', photo: expect.objectContaining({ id: created.body.id, status: 'DELETED', link: expect.stringContaining('history.jpg') }) }),
    ]));
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

async function createAuthenticatedAgent(app: INestApplication, prisma: PrismaClient, isTest = false) {
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
      isTest,
    },
  });

  const agent = request.agent(app.getHttpServer());
  await agent
    .post('/auth/login')
    .send({ email, password })
    .expect(201);

  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  return { agent, user: { id: user.id, email, isTest: user.isTest } };
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
