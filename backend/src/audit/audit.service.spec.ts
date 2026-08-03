import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { beginTestTransaction, rollbackTestTransaction, startTestDatabase } from '../test-utils/test-db';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  let moduleRef: TestingModule;
  let service: AuditService;
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = await startTestDatabase();
    moduleRef = await Test.createTestingModule({
      providers: [AuditService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(AuditService);
  });

  beforeEach(async () => {
    await beginTestTransaction(prisma);
  });

  afterEach(async () => {
    await rollbackTestTransaction(prisma);
  });

  afterAll(async () => {
    await moduleRef.close();
    await prisma.$disconnect();
  });

  it('records actor, action, old and new values with field changes', async () => {
    const entityId = `cat-${Date.now()}`;
    await service.record({
      actor: { id: 'user-1', email: 'mila@example.com', fullName: 'Mila Admin' },
      action: 'update',
      entityType: 'cat',
      entityId,
      entityName: 'Luna',
      oldValues: { name: 'Mila', status: 'ACTIVE' },
      newValues: { name: 'Luna', status: 'ACTIVE' },
    });

    const record = await (prisma as any).auditLog.findFirst({ where: { entityId } });
    expect(record.actorEmail).toBe('mila@example.com');
    expect(record.changes).toEqual([{ field: 'name', from: 'Mila', to: 'Luna' }]);
  });

  it('filters audit records by date range and rejects invalid dates', async () => {
    await (prisma as any).auditLog.create({ data: {
      actorUserId: 'user-2',
      actorEmail: 'leo@example.com',
      actorName: 'Leo Admin',
      action: 'create',
      entityType: 'location',
      entityId: 'location-1',
      entityName: 'Shelter',
      newValues: { name: 'Shelter' },
      changes: [{ field: 'name', from: null, to: 'Shelter' }],
      createdAt: new Date('2050-06-01T12:00:00.000Z'),
    } });

    const page = await service.list({ from: '2050-01-01', to: '2050-12-31', limit: 10 });
    expect(page.data.some((item: any) => item.entityId === 'location-1')).toBe(true);
    await expect(service.list({ from: 'not-a-date' })).rejects.toThrow(BadRequestException);
  });
});
