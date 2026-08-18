import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { PrismaService } from '../../database/prisma.service';
import {
  beginTestTransaction,
  getS3Client,
  rollbackTestTransaction,
  startTestDatabase,
} from '../../test-utils/test-db';
import { CatPhotoUrlService } from '../cat-photo-url.service';
import { CreateCatCommand } from './create-cat.command';
import { CreateCatHandler } from './create-cat.handler';

describe('CreateCatHandler', () => {
  let handler: CreateCatHandler;
  let prisma: PrismaService;
  let s3Client: S3Client;

  beforeAll(async () => {
    prisma = await startTestDatabase();
    s3Client = getS3Client();
    handler = new CreateCatHandler(
      prisma,
      new CatPhotoUrlService(new ConfigService(), s3Client),
    );
  });

  beforeEach(async () => {
    await beginTestTransaction(prisma);
    const user = await prisma.user.create({
      data: { email: `${unique('creator')}@example.com`, fullName: 'Cat Creator', status: 'ACTIVE' },
    });
    actorUserId = user.id;
  });
  afterEach(async () => rollbackTestTransaction(prisma));

  afterAll(async () => {
    await prisma.$disconnect();
    s3Client.destroy();
  });

  it('creates a cat card', async () => {
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
      actorUserId,
      false,
    ));

    expect(card.name).toBe('Mila');
    expect(card.primaryPhotoUrl).toBeNull();
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
      actorUserId,
      false,
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
      createdByUserId: actorUserId,
      isTest: false,
    });
  });

  it('creates test cats for test users and rejects opposite-status locations', async () => {
    const testLocation = await prisma.location.create({
      data: { name: unique('test-location'), status: 'ACTIVE', isTest: true },
    });
    const regularLocation = await prisma.location.create({
      data: { name: unique('regular-location'), status: 'ACTIVE', isTest: false },
    });

    const card = await handler.execute(createCommand({
      name: 'Test Partition Cat',
      currentLocationId: testLocation.id,
      isTest: true,
    }));

    const stored = await prisma.cat.findUniqueOrThrow({ where: { id: card.id } });
    expect(card.isTest).toBe(true);
    expect(stored.isTest).toBe(true);
    await expect(handler.execute(createCommand({
      name: 'Cross Partition Cat',
      currentLocationId: regularLocation.id,
      isTest: true,
    }))).rejects.toThrow(new NotFoundException('Active location not found'));
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

let actorUserId: string;

type CommandOverrides = Partial<{
  name: string;
  microchipNumber: string;
  passportNumber: string;
  currentLocationId: string;
  isTest: boolean;
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
    actorUserId,
    overrides.isTest ?? false,
  );
}

function unique(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
