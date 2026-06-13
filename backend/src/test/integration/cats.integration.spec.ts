import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import configuration from '../../config/configuration';
import { PrismaService } from '../../database/prisma.service';
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard';
import { CatsModule } from '../../cats/cats.module';
import { startTestDatabase } from '../../test-utils/test-db';

describe('Cats endpoints', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = await startTestDatabase();
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ load: [configuration], isGlobal: true }), CatsModule],
    })
      .overrideGuard(SessionAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await moduleRef?.close();
    await prisma?.$disconnect();
  });

  it('POST /api/cats creates a cat card', async () => {
    const location = await createLocation(prisma, 'post');
    const response = await request(app.getHttpServer())
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

    const response = await request(app.getHttpServer())
      .put(`/api/cats/${cat.id}/primary-photo`)
      .attach('photo', Buffer.from('fake image bytes'), {
        filename: 'mila portrait.jpg',
        contentType: 'image/jpeg',
      })
      .expect(200);

    expect(response.body.primaryPhotoUrl).toContain(`cats/${cat.id}/primary/`);
    expect(response.body.primaryPhotoUrl).toContain('mila-portrait.jpg');
    expect(response.body.primaryPhotoKey).toBeUndefined();
  });

  it('GET /api/cats lists active cat cards with filters', async () => {
    const location = await createLocation(prisma, 'list');
    const prefix = unique('list');
    await createCat(prisma, { name: `${prefix} Mila`, currentLocationId: location.id, microchipNumber: `${prefix}-chip` });
    await createCat(prisma, { name: `${prefix} Archive`, currentLocationId: location.id, status: 'ARCHIVED' });

    const response = await request(app.getHttpServer())
      .get('/api/cats')
      .query({ locationId: location.id, search: prefix, limit: 50 })
      .expect(200);

    expect(response.body.total).toBe(1);
    expect(response.body.data[0].name).toContain('Mila');
  });

  it('GET /api/cats/:id/card returns one cat card', async () => {
    const cat = await createCat(prisma, { name: unique('card') });

    const response = await request(app.getHttpServer())
      .get(`/api/cats/${cat.id}/card`)
      .expect(200);

    expect(response.body.id).toBe(cat.id);
    expect(response.body.primaryPhotoUrl).toBeNull();
  });

  it('PATCH /api/cats/:id updates a cat card', async () => {
    const cat = await createCat(prisma, { name: unique('patch') });

    const response = await request(app.getHttpServer())
      .patch(`/api/cats/${cat.id}`)
      .send({ name: 'Updated cat', status: 'ADOPTED' })
      .expect(200);

    expect(response.body.name).toBe('Updated cat');
    expect(response.body.status).toBe('ADOPTED');
  });

  it('returns validation and not found errors', async () => {
    await request(app.getHttpServer()).get('/api/cats').query({ limit: 101 }).expect(400);
    await request(app.getHttpServer()).get('/api/cats/missing/card').expect(404);
    await request(app.getHttpServer()).put('/api/cats/missing/primary-photo').expect(404);
    await request(app.getHttpServer()).post('/api/cats').send({
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

async function createLocation(prisma: PrismaService, prefix: string) {
  return (prisma as any).location.create({
    data: { name: unique(`endpoint-${prefix}`), type: 'FOSTER', status: 'ACTIVE' },
  });
}

async function createCat(
  prisma: PrismaService,
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
