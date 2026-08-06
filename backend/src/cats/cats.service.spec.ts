import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import configuration from '../config/configuration';
import { PrismaService } from '../database/prisma.service';
import {
  beginTestTransaction,
  rollbackTestTransaction,
  startTestDatabase,
} from '../test-utils/test-db';
import { CatPhotoUrlService } from './cat-photo-url.service';
import { CatsService } from './cats.service';

describe('CatsService', () => {
  let moduleRef: TestingModule;
  let service: CatsService;
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = await startTestDatabase();
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ load: [configuration], isGlobal: true })],
      providers: [
        CatsService,
        CatPhotoUrlService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(CatsService);
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

  it('uploads primary photo data to S3 and returns a presigned URL', async () => {
    const card = await createCatFixture(prisma, {
      name: 'Photo Cat',
      sex: 'UNKNOWN',
      sterilizationStatus: 'UNKNOWN',
    });

    const updated = await service.updatePrimaryPhoto(card.id, {
      originalname: 'mila portrait.jpg',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('fake image bytes'),
    });

    expect(updated.primaryPhotoUrl).toContain(`cats/${card.id}/photos/`);
    expect(updated.primaryPhotoUrl).toContain('mila-portrait.jpg');
    const stored = await (prisma as any).cat.findUnique({ where: { id: card.id } });
    expect(stored.primaryPhotoKey).toContain(`cats/${card.id}/photos/`);
  });

  it('manages gallery photos and primary photo selection', async () => {
    const card = await createCatFixture(prisma, {
      name: 'Gallery Cat',
      sex: 'UNKNOWN',
      sterilizationStatus: 'UNKNOWN',
    });

    const first = await service.addPhoto(card.id, {
      originalname: 'first.jpg',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('first image bytes'),
    });
    const second = await service.addPhoto(card.id, {
      originalname: 'second.jpg',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('second image bytes'),
    });

    expect(first.isPrimary).toBe(true);
    expect(second.isPrimary).toBe(false);
    expect(await service.listPhotos(card.id)).toHaveLength(2);

    const updated = await service.setPrimaryPhoto(card.id, second.id);
    expect(updated.primaryPhotoUrl).toContain('second.jpg');

    const afterDelete = await service.deletePhoto(card.id, second.id);
    expect(afterDelete.primaryPhotoUrl).toContain('first.jpg');
    expect(await service.listPhotos(card.id)).toHaveLength(1);
  });

  it('rejects empty primary photo upload requests', async () => {
    const card = await createCatFixture(prisma, {
      name: 'No Photo Cat',
      sex: 'UNKNOWN',
      sterilizationStatus: 'UNKNOWN',
    });

    await expect(service.updatePrimaryPhoto(card.id, undefined)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('filters by default active status, location, search, and pagination', async () => {
    const location = await createLocation(prisma, 'filter');
    const otherLocation = await createLocation(prisma, 'other');
    const prefix = unique('search');
    await createCatFixture(prisma, { name: `${prefix} Mila`, sex: 'FEMALE', sterilizationStatus: 'UNKNOWN', currentLocationId: location.id, microchipNumber: `${prefix}-001` });
    await createCatFixture(prisma, { name: `${prefix} Boris`, sex: 'MALE', sterilizationStatus: 'UNKNOWN', currentLocationId: location.id, passportNumber: `${prefix}-P` });
    const archived = await createCatFixture(prisma, { name: `${prefix} Old`, sex: 'UNKNOWN', sterilizationStatus: 'UNKNOWN', currentLocationId: location.id });
    await service.updateCat(archived.id, { status: 'ARCHIVED' });
    await createCatFixture(prisma, { name: `${prefix} Elsewhere`, sex: 'FEMALE', sterilizationStatus: 'UNKNOWN', currentLocationId: otherLocation.id });

    const page = await service.findAll({ locationId: location.id, search: prefix, skip: 1, limit: 1 });
    expect(page.total).toBe(2);
    expect(page.data).toHaveLength(1);
    expect(page.data[0].status).toBe('ACTIVE');

    const archivedPage = await service.findAll({ status: 'ARCHIVED', search: prefix });
    expect(archivedPage.data).toHaveLength(1);
    expect(archivedPage.data[0].name).toContain('Old');
  });

  it('updates cat card fields and can clear nullable fields', async () => {
    const location = await createLocation(prisma, 'update');
    const card = await createCatFixture(prisma, { name: 'Mila', sex: 'FEMALE', color: 'Calico', sterilizationStatus: 'UNKNOWN', currentLocationId: location.id });

    const updated = await service.updateCat(card.id, {
      name: 'Luna',
      color: null,
      sex: 'UNKNOWN',
      sterilizationStatus: 'STERILIZED',
      currentLocationId: null,
    });

    expect(updated.name).toBe('Luna');
    expect(updated.color).toBeNull();
    expect(updated.currentLocationId).toBeNull();
  });

  it('adds, lists, and removes cat weight entries', async () => {
    const card = await createCatFixture(prisma, { name: 'Weight Cat', sex: 'FEMALE', sterilizationStatus: 'UNKNOWN' });

    const weight = await service.addWeight(card.id, { weightKg: 4.25, measuredAt: '2026-07-30' });

    expect(weight.catId).toBe(card.id);
    expect(weight.weightKg).toBe(4.25);
    expect(weight.measuredAt).toContain('2026-07-30');

    const weights = await service.listWeights(card.id);
    expect(weights).toHaveLength(1);
    expect(weights[0].id).toBe(weight.id);

    await service.removeWeight(card.id, weight.id);
    await expect(service.removeWeight(card.id, weight.id)).rejects.toThrow(NotFoundException);
    await expect(service.addWeight(card.id, { weightKg: 0, measuredAt: '2026-07-30' })).rejects.toThrow(BadRequestException);
    await expect(service.addWeight(card.id, { weightKg: 4, measuredAt: 'bad-date' })).rejects.toThrow(BadRequestException);
  });

  it('creates reusable tags, attaches them to cats, and filters by tag', async () => {
    const cat = await createCatFixture(prisma, { name: unique('tagged'), sex: 'FEMALE', sterilizationStatus: 'UNKNOWN' });
    const otherCat = await createCatFixture(prisma, { name: unique('untagged'), sex: 'MALE', sterilizationStatus: 'UNKNOWN' });

    const tag = await service.createTag({ name: '  Needs foster  ' });
    const duplicate = await service.createTag({ name: 'Needs foster' });
    expect(duplicate.id).toBe(tag.id);

    const tagged = await service.addTag(cat.id, tag.id);
    expect(tagged.tags).toEqual([{ id: tag.id, name: 'Needs foster', color: '#ffb38a' }]);

    const page = await service.findAll({ tagId: tag.id, limit: 10 });
    expect(page.data.map((item) => item.id)).toContain(cat.id);
    expect(page.data.map((item) => item.id)).not.toContain(otherCat.id);

    const removed = await service.removeTag(cat.id, tag.id);
    expect(removed.tags).toHaveLength(0);
    await expect(service.createTag({ name: '' })).rejects.toThrow(BadRequestException);
  });

  it('updates tag color and blocks deleting tags that are used by cats', async () => {
    const cat = await createCatFixture(prisma, { name: unique('tagged-delete'), sex: 'FEMALE', sterilizationStatus: 'UNKNOWN' });
    const tag = await service.createTag({ name: unique('editable-tag'), color: '#9ee6a8' });

    expect(tag.color).toBe('#9ee6a8');
    const updated = await service.updateTag(tag.id, { name: unique('renamed-tag'), color: '#8ecaff' });
    expect(updated.color).toBe('#8ecaff');
    await expect(service.updateTag(tag.id, { color: '#123456' })).rejects.toThrow(BadRequestException);

    await service.addTag(cat.id, tag.id);
    await expect(service.deleteTag(tag.id)).rejects.toThrow(ConflictException);

    await service.removeTag(cat.id, tag.id);
    await expect(service.deleteTag(tag.id)).resolves.toBeUndefined();
  });

  it('returns 404 for missing cards and 400 for invalid pagination', async () => {
    await expect(service.findCardById('missing')).rejects.toThrow(NotFoundException);
    await expect(service.findAll({ limit: 101 })).rejects.toThrow(BadRequestException);
    await expect(service.findAll({ skip: -1 })).rejects.toThrow(BadRequestException);
  });

  it('has migration-backed indexes, unique constraints, enum defaults, and nullable location on delete', async () => {
    const indexes: Array<{ indexname: string }> = await prisma.$queryRaw`
      SELECT indexname FROM pg_indexes WHERE tablename = 'Cat'
    `;
    expect(indexes.map((index) => index.indexname)).toEqual(
      expect.arrayContaining([
        'Cat_currentLocationId_idx',
        'Cat_status_idx',
        'Cat_name_idx',
        'Cat_intakeDate_idx',
        'Cat_microchipNumber_key',
        'Cat_passportNumber_key',
      ]),
    );

    const defaults = await prisma.$queryRaw<Array<{ sex_default: string; status_default: string; sterilization_default: string }>>`
      SELECT
        column_default AS sex_default,
        (SELECT column_default FROM information_schema.columns WHERE table_name = 'Cat' AND column_name = 'status') AS status_default,
        (SELECT column_default FROM information_schema.columns WHERE table_name = 'Cat' AND column_name = 'sterilizationStatus') AS sterilization_default
      FROM information_schema.columns
      WHERE table_name = 'Cat' AND column_name = 'sex'
    `;
    expect(defaults[0].sex_default).toContain('UNKNOWN');
    expect(defaults[0].status_default).toContain('ACTIVE');
    expect(defaults[0].sterilization_default).toContain('UNKNOWN');

    const foreignKeys = await prisma.$queryRaw<Array<{ delete_rule: string }>>`
      SELECT delete_rule
      FROM information_schema.referential_constraints
      WHERE constraint_name = 'Cat_currentLocationId_fkey'
    `;
    expect(foreignKeys[0].delete_rule).toBe('SET NULL');
  });
});

function unique(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function createCatFixture(
  prisma: PrismaService,
  data: Prisma.CatUncheckedCreateInput,
) {
  return prisma.$transaction((transaction) => transaction.cat.create({ data }));
}

async function createLocation(
  prisma: PrismaService,
  namePrefix: string,
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' = 'ACTIVE',
) {
  return (prisma as any).location.create({
    data: {
      name: unique(`cats-${namePrefix}`),
      status,
    },
  });
}
