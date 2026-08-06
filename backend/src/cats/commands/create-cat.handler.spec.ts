import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import configuration from '../../config/configuration';
import { PrismaService } from '../../database/prisma.service';
import {
  beginTestTransaction,
  rollbackTestTransaction,
  startTestDatabase,
} from '../../test-utils/test-db';
import { CatPhotoUrlService } from '../cat-photo-url.service';
import { CreateCatCommand } from './create-cat.command';
import { CreateCatHandler } from './create-cat.handler';

describe('CreateCatHandler', () => {
  let moduleRef: TestingModule;
  let handler: CreateCatHandler;
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = await startTestDatabase();
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ load: [configuration], isGlobal: true })],
      providers: [
        CreateCatHandler,
        CatPhotoUrlService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    handler = moduleRef.get(CreateCatHandler);
  });

  beforeEach(async () => beginTestTransaction(prisma));
  afterEach(async () => rollbackTestTransaction(prisma));

  afterAll(async () => {
    await moduleRef.close();
    await prisma.$disconnect();
  });

  it('creates a cat card and audit record', async () => {
    const actor: Express.User = {
      id: 'user-1',
      email: 'staff@example.com',
      fullName: 'Shelter Staff',
      role: 'STAFF',
    };

    const card = await handler.execute(new CreateCatCommand(
      'Mila',
      'FEMALE',
      null,
      null,
      null,
      null,
      null,
      null,
      'STERILIZED',
      null,
      actor.id,
      actor.email,
      actor.fullName,
    ));

    expect(card.name).toBe('Mila');
    expect(card.primaryPhotoUrl).toBeNull();
    const audit = await prisma.auditLog.findFirst({ where: { entityId: card.id } });
    expect(audit).toMatchObject({
      actorUserId: actor.id,
      action: 'create',
      entityType: 'cat',
      entityName: 'Mila',
    });
  });

  it('persists every command field and returns the active location', async () => {
    const location = await prisma.location.create({
      data: { name: unique('active-location'), status: 'ACTIVE' },
    });
    const estimatedBirthDate = new Date('2024-03-15');
    const intakeDate = new Date('2026-04-01');
    const microchipNumber = unique('chip');
    const passportNumber = unique('passport');

    const card = await handler.execute(new CreateCatCommand(
      'Mila',
      'FEMALE',
      'Calico',
      estimatedBirthDate,
      intakeDate,
      'Found near clinic',
      microchipNumber,
      passportNumber,
      'STERILIZED',
      location.id,
      'user-1',
      'staff@example.com',
      'Shelter Staff',
    ));

    expect(card).toMatchObject({
      name: 'Mila',
      sex: 'FEMALE',
      color: 'Calico',
      estimatedBirthDate: estimatedBirthDate.toISOString(),
      intakeDate: intakeDate.toISOString(),
      sterilizationStatus: 'STERILIZED',
      currentLocationId: location.id,
      currentLocationName: location.name,
      primaryPhotoUrl: null,
      microchipNumber,
      tags: [],
    });
    const stored = await prisma.cat.findUniqueOrThrow({ where: { id: card.id } });
    expect(stored).toMatchObject({
      rescueSource: 'Found near clinic',
      passportNumber,
    });
  });

  it.each(['INACTIVE', 'ARCHIVED'] as const)(
    'rejects a %s location',
    async (status) => {
      const location = await prisma.location.create({
        data: { name: unique(`${status}-location`), status },
      });

      await expect(handler.execute(createCommand({
        name: `${status} Cat`,
        currentLocationId: location.id,
      }))).rejects.toThrow(new NotFoundException('Active location not found'));
    },
  );

  it('rejects a missing location', async () => {
    await expect(handler.execute(createCommand({
      name: 'Missing Location Cat',
      currentLocationId: 'missing-location',
    }))).rejects.toThrow(new NotFoundException('Active location not found'));
  });

  it.each(['microchipNumber', 'passportNumber'] as const)(
    'rejects a duplicate %s before inserting',
    async (field) => {
      const value = unique(field);
      await handler.execute(createCommand({ name: `First ${field}`, [field]: value }));

      await expect(handler.execute(createCommand({
        name: `Second ${field}`,
        [field]: value,
      }))).rejects.toThrow(ConflictException);
    },
  );
});

type CommandOverrides = Partial<{
  name: string;
  microchipNumber: string;
  passportNumber: string;
  currentLocationId: string;
}>;

function createCommand(overrides: CommandOverrides = {}): CreateCatCommand {
  return new CreateCatCommand(
    overrides.name ?? 'Mila',
    'UNKNOWN',
    null,
    null,
    null,
    null,
    overrides.microchipNumber ?? null,
    overrides.passportNumber ?? null,
    'UNKNOWN',
    overrides.currentLocationId ?? null,
    null,
    null,
    null,
  );
}

function unique(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}