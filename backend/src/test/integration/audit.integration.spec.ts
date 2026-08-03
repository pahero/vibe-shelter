import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AuditModule } from '../../audit/audit.module';
import { AuditService } from '../../audit/audit.service';
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard';
import configuration from '../../config/configuration';
import { PrismaService } from '../../database/prisma.service';
import { startTestDatabase } from '../../test-utils/test-db';

describe('Audit endpoints', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let audit: AuditService;

  beforeAll(async () => {
    prisma = await startTestDatabase();
    moduleRef = await Test.createTestingModule({ imports: [ConfigModule.forRoot({ load: [configuration], isGlobal: true }), AuditModule] })
      .overrideGuard(SessionAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleRef.createNestApplication();
    audit = moduleRef.get(AuditService);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await moduleRef?.close();
    await prisma?.$disconnect();
  });

  it('GET /api/audit lists audit entries filtered by user', async () => {
    const marker = `audit-${Date.now()}`;
    await audit.record({
      actor: { id: marker, email: `${marker}@example.com`, fullName: 'Audit User' },
      action: 'update',
      entityType: 'cat',
      entityId: marker,
      entityName: 'Mila',
      oldValues: { name: 'Old' },
      newValues: { name: 'Mila' },
    });

    const response = await request(app.getHttpServer())
      .get('/api/audit')
      .query({ user: marker, limit: 10 })
      .expect(200);

    expect(response.body.total).toBe(1);
    expect(response.body.data[0].actorEmail).toBe(`${marker}@example.com`);
    expect(response.body.data[0].changes).toEqual([{ field: 'name', from: 'Old', to: 'Mila' }]);
  });
});
