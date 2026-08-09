import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, Prisma } from '@prisma/client';
import {
  beginTestTransaction,
  createBucket,
  deleteBucket,
  getS3Client,
  getTestDatabase,
  rollbackTestTransaction,
  runInTestTransaction,
} from '../test-utils/test-db';
import { CatPhotoUrlService } from './cat-photo-url.service';
import { CatsService } from './cats.service';
import { S3Client } from '@aws-sdk/client-s3';

describe('CatsService', () => {
  let prisma: PrismaClient;
  let config: ConfigService;
  let s3Client: S3Client;
  let bucketName: string;

  function createService(tx: Prisma.TransactionClient) {
    return new CatsService(
      tx as PrismaClient,
      new CatPhotoUrlService(config, s3Client),
      undefined);
  }

  beforeAll(async () => {
    prisma = getTestDatabase();
    s3Client = getS3Client();
  });

  beforeEach(async () => {
    bucketName = await createBucket('cats-service-test', s3Client);
    config = new ConfigService();
    config.set('s3.bucketName', bucketName);
  });

  afterEach(async () => {
    await deleteBucket(bucketName, s3Client);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    s3Client.destroy();
  });

  it('uploads primary photo data to S3 and returns a presigned URL', async () => {
    await runInTestTransaction(prisma, async (tx) => {
      const card = await createCatFixture(tx, {
        name: 'Photo Cat',
        sex: 'UNKNOWN',
        sterilizationStatus: 'UNKNOWN',
      });

      const innetService = createService(tx);
      const updated = await innetService.updatePrimaryPhoto(card.id, {
        originalname: 'mila portrait.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('fake image bytes'),
      });
      
      expect(updated.primaryPhotoUrl).toContain(`cats/${card.id}/photos/`);
      expect(updated.primaryPhotoUrl).toContain('mila-portrait.jpg');
      const stored = await tx.cat.findUnique({ where: { id: card.id } });
      expect(stored!.primaryPhotoKey).toContain(`cats/${card.id}/photos/`);
    });
  });

  it('manages gallery photos and primary photo selection', async () => {
    await runInTestTransaction(prisma, async (tx) => {
      const card = await createCatFixture(tx, {
        name: 'Gallery Cat',
        sex: 'UNKNOWN',
        sterilizationStatus: 'UNKNOWN',
      });

      const innetService = createService(tx);
      const first = await innetService.addPhoto(card.id, {
        originalname: 'first.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('first image bytes'),
      });
      const second = await innetService.addPhoto(card.id, {
        originalname: 'second.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('second image bytes'),
      });

      expect(first.isPrimary).toBe(true);
      expect(second.isPrimary).toBe(false);
      expect(await innetService.listPhotos(card.id)).toHaveLength(2);

      const updated = await innetService.setPrimaryPhoto(card.id, second.id);
      expect(updated.primaryPhotoUrl).toContain('second.jpg');

      const afterDelete = await innetService.deletePhoto(card.id, second.id);
      expect(afterDelete.primaryPhotoUrl).toContain('first.jpg');
      expect(await innetService.listPhotos(card.id)).toHaveLength(1);
    });
  });

  it('rejects empty primary photo upload requests', async () => {
    await runInTestTransaction(prisma, async (tx) => {
      const card = await createCatFixture(tx, {
        name: 'No Photo Cat',
        sex: 'UNKNOWN',
        sterilizationStatus: 'UNKNOWN',
      });

      const innetService = createService(tx);
      await expect(innetService.updatePrimaryPhoto(card.id, undefined)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  it('filters by default active status, location, search, and pagination', async () => {
    await runInTestTransaction(prisma, async (tx) => {
      const location = await createLocation(tx, 'filter');
      const otherLocation = await createLocation(tx, 'other');
      const prefix = unique('search');
      await createCatFixture(tx, { name: `${prefix} Mila`, sex: 'FEMALE', sterilizationStatus: 'UNKNOWN', currentLocationId: location.id, microchipNumber: `${prefix}-001` });
      await createCatFixture(tx, { name: `${prefix} Boris`, sex: 'MALE', sterilizationStatus: 'UNKNOWN', currentLocationId: location.id, passportNumber: `${prefix}-P` });
      const archived = await createCatFixture(tx, { name: `${prefix} Old`, sex: 'UNKNOWN', sterilizationStatus: 'UNKNOWN', currentLocationId: location.id });
      const innetService = createService(tx);
      await innetService.updateCat(archived.id, { status: 'ARCHIVED' });
      await createCatFixture(tx, { name: `${prefix} Elsewhere`, sex: 'FEMALE', sterilizationStatus: 'UNKNOWN', currentLocationId: otherLocation.id });

      const page = await innetService.findAll({ locationId: location.id, search: prefix, skip: 1, limit: 1 });
      expect(page.total).toBe(2);
      expect(page.data).toHaveLength(1);
      expect(page.data[0].status).toBe('ACTIVE');

      const archivedPage = await innetService.findAll({ status: 'ARCHIVED', search: prefix });
      expect(archivedPage.data).toHaveLength(1);
      expect(archivedPage.data[0].name).toContain('Old');
    });
  });

  it('updates cat card fields and can clear nullable fields', async () => {
    await runInTestTransaction(prisma, async (tx) => {
      const location = await createLocation(tx, 'update');
      const card = await createCatFixture(tx, { name: 'Mila', sex: 'FEMALE', color: 'Calico', sterilizationStatus: 'UNKNOWN', currentLocationId: location.id });

      const innetService = createService(tx);
      const updated = await innetService.updateCat(card.id, {
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
  });

  it('adds, lists, and removes cat weight entries', async () => {
    await runInTestTransaction(prisma, async (tx) => {
      const card = await createCatFixture(tx, { name: 'Weight Cat', sex: 'FEMALE', sterilizationStatus: 'UNKNOWN' });

      const innetService = createService(tx);
      const weight = await innetService.addWeight(card.id, { weightKg: 4.25, measuredAt: '2026-07-30' });

      expect(weight.catId).toBe(card.id);
      expect(weight.weightKg).toBe(4.25);
      expect(weight.measuredAt).toContain('2026-07-30');

      const weights = await innetService.listWeights(card.id);
      expect(weights).toHaveLength(1);
      expect(weights[0].id).toBe(weight.id);

      await innetService.removeWeight(card.id, weight.id);
      await expect(innetService.removeWeight(card.id, weight.id)).rejects.toThrow(NotFoundException);
      await expect(innetService.addWeight(card.id, { weightKg: 0, measuredAt: '2026-07-30' })).rejects.toThrow(BadRequestException);
      await expect(innetService.addWeight(card.id, { weightKg: 4, measuredAt: 'bad-date' })).rejects.toThrow(BadRequestException);
    });
  });

  it('creates reusable tags, attaches them to cats, and filters by tag', async () => {
    await runInTestTransaction(prisma, async (tx) => {
      const cat = await createCatFixture(tx, { name: unique('tagged'), sex: 'FEMALE', sterilizationStatus: 'UNKNOWN' });
      const otherCat = await createCatFixture(tx, { name: unique('untagged'), sex: 'MALE', sterilizationStatus: 'UNKNOWN' });

      const innetService = createService(tx);
      const tag = await innetService.createTag({ name: '  Needs foster  ' });
      const duplicate = await innetService.createTag({ name: 'Needs foster' });
      expect(duplicate.id).toBe(tag.id);

      const tagged = await innetService.addTag(cat.id, tag.id);
      expect(tagged.tags).toEqual([{ id: tag.id, name: 'Needs foster', color: '#ffb38a' }]);

      const page = await innetService.findAll({ tagId: tag.id, limit: 10 });
      expect(page.data.map((item) => item.id)).toContain(cat.id);
      expect(page.data.map((item) => item.id)).not.toContain(otherCat.id);

      const removed = await innetService.removeTag(cat.id, tag.id);
      expect(removed.tags).toHaveLength(0);
      await expect(innetService.createTag({ name: '' })).rejects.toThrow(BadRequestException);
    });
  });

  it('updates tag color and blocks deleting tags that are used by cats', async () => {
    await runInTestTransaction(prisma, async (tx) => {
      const cat = await createCatFixture(tx, { name: unique('tagged-delete'), sex: 'FEMALE', sterilizationStatus: 'UNKNOWN' });
      const innetService = createService(tx);
      const tag = await innetService.createTag({ name: unique('editable-tag'), color: '#9ee6a8' });

      expect(tag.color).toBe('#9ee6a8');
      const updated = await innetService.updateTag(tag.id, { name: unique('renamed-tag'), color: '#8ecaff' });
      expect(updated.color).toBe('#8ecaff');
      await expect(innetService.updateTag(tag.id, { color: '#123456' })).rejects.toThrow(BadRequestException);

      await innetService.addTag(cat.id, tag.id);
      await expect(innetService.deleteTag(tag.id)).rejects.toThrow(ConflictException);

      await innetService.removeTag(cat.id, tag.id);
      await expect(innetService.deleteTag(tag.id)).resolves.toBeUndefined();
    });
  });

  it('returns 404 for missing cards and 400 for invalid pagination', async () => {
    await runInTestTransaction(prisma, async (tx) => {
      const innetService = createService(tx);
      await expect(innetService.findCardById('missing')).rejects.toThrow(NotFoundException);
      await expect(innetService.findAll({ limit: 101 })).rejects.toThrow(BadRequestException);
      await expect(innetService.findAll({ skip: -1 })).rejects.toThrow(BadRequestException);
    });
  });

  it('has migration-backed indexes, unique constraints, enum defaults, and nullable location on delete', async () => {
    await runInTestTransaction(prisma, async (tx) => {
      const indexes: Array<{ indexname: string }> = await tx.$queryRaw`
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

      const defaults = await tx.$queryRaw<Array<{ sex_default: string; status_default: string; sterilization_default: string }>>`
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

      const foreignKeys = await tx.$queryRaw<Array<{ delete_rule: string }>>`
        SELECT delete_rule
        FROM information_schema.referential_constraints
        WHERE constraint_name = 'Cat_currentLocationId_fkey'
      `;
      expect(foreignKeys[0].delete_rule).toBe('SET NULL');
    });
  });
});

function unique(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function createCatFixture(
  prisma: PrismaClient | Prisma.TransactionClient,
  data: Prisma.CatUncheckedCreateInput,
) {
  return await prisma.cat.create({ data });
}

async function createLocation(
  prisma: PrismaClient | Prisma.TransactionClient,
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
