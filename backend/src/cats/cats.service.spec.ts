import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, Prisma } from '@prisma/client';
import {
  createBucket,
  deleteBucket,
  getS3Client,
  runInTestTransaction,
} from '../test-utils/test-db';
import { CatPhotoUrlService } from './cat-photo-url.service';
import { CatsService } from './cats.service';
import { S3Client } from '@aws-sdk/client-s3';

describe('CatsService', () => {
  let config: ConfigService;
  let s3Client: S3Client;
  let bucketName: string;

  function createService(tx: Prisma.TransactionClient) {
    return new CatsService(
      tx as PrismaClient,
      new CatPhotoUrlService(config, s3Client),
    );
  }

  beforeAll(async () => {
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
    s3Client.destroy();
  });

  it('uploads primary photo data to S3 and returns a presigned URL', async () => {
    await runInTestTransaction(async (tx) => {
      const card = await createCatFixture(tx, {
        name: 'Photo Cat',
        sex: 'UNKNOWN',
        sterilizationStatus: 'UNKNOWN',
      });

      const service = createService(tx);
      const updated = await service.updatePrimaryPhoto(card.id, {
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
    await runInTestTransaction(async (tx) => {
      const card = await createCatFixture(tx, {
        name: 'Gallery Cat',
        sex: 'UNKNOWN',
        sterilizationStatus: 'UNKNOWN',
      });

      const service = createService(tx);
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
  });

  it('rejects empty primary photo upload requests', async () => {
    await runInTestTransaction(async (tx) => {
      const card = await createCatFixture(tx, {
        name: 'No Photo Cat',
        sex: 'UNKNOWN',
        sterilizationStatus: 'UNKNOWN',
      });

      const service = createService(tx);
      await expect(service.updatePrimaryPhoto(card.id, undefined)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  it('filters by default active status, location, search, and pagination', async () => {
    await runInTestTransaction(async (tx) => {
      const location = await createLocation(tx, 'filter');
      const otherLocation = await createLocation(tx, 'other');
      const prefix = unique('search');
      await createCatFixture(tx, { name: `${prefix} Mila`, sex: 'FEMALE', sterilizationStatus: 'UNKNOWN', currentLocationId: location.id, microchipNumber: `${prefix}-001` });
      await createCatFixture(tx, { name: `${prefix} Boris`, sex: 'MALE', sterilizationStatus: 'UNKNOWN', currentLocationId: location.id, passportNumber: `${prefix}-P` });
      const archived = await createCatFixture(tx, { name: `${prefix} Old`, sex: 'UNKNOWN', sterilizationStatus: 'UNKNOWN', currentLocationId: location.id });
      const service = createService(tx);
      await service.updateCat(archived.id, { status: 'ARCHIVED' });
      await createCatFixture(tx, { name: `${prefix} Elsewhere`, sex: 'FEMALE', sterilizationStatus: 'UNKNOWN', currentLocationId: otherLocation.id });

      const page = await service.findAll({ locationId: location.id, search: prefix, skip: 1, limit: 1 });
      expect(page.total).toBe(2);
      expect(page.data).toHaveLength(1);
      expect(page.data[0].status).toBe('ACTIVE');

      const archivedPage = await service.findAll({ status: 'ARCHIVED', search: prefix });
      expect(archivedPage.data).toHaveLength(1);
      expect(archivedPage.data[0].name).toContain('Old');
    });
  });

  it('filters cat list and detail by current user test status', async () => {
    await runInTestTransaction(async (tx) => {
      const prefix = unique('partition');
      const regular = await createCatFixture(tx, { name: `${prefix}-regular`, sex: 'UNKNOWN', sterilizationStatus: 'UNKNOWN', isTest: false });
      const test = await createCatFixture(tx, { name: `${prefix}-test`, sex: 'UNKNOWN', sterilizationStatus: 'UNKNOWN', isTest: true });
      const service = createService(tx);

      const regularPage = await service.findAll({ search: prefix }, false);
      const testPage = await service.findAll({ search: prefix }, true);

      expect(regularPage.data.map((cat) => cat.id)).toContain(regular.id);
      expect(regularPage.data.map((cat) => cat.id)).not.toContain(test.id);
      expect(testPage.data.map((cat) => cat.id)).toContain(test.id);
      expect(testPage.data.map((cat) => cat.id)).not.toContain(regular.id);
      await expect(service.findCardById(test.id, false)).rejects.toThrow(NotFoundException);
      await expect(service.findCardById(regular.id, true)).rejects.toThrow(NotFoundException);
    });
  });

  it('updates cat card fields and can clear nullable fields', async () => {
    await runInTestTransaction(async (tx) => {
      const location = await createLocation(tx, 'update');
      const card = await createCatFixture(tx, { name: 'Mila', sex: 'FEMALE', color: 'Calico', sterilizationStatus: 'UNKNOWN', currentLocationId: location.id });

      const service = createService(tx);
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
  });

  it('rejects cat updates that reference an opposite-status location', async () => {
    await runInTestTransaction(async (tx) => {
      const regularLocation = await createLocation(tx, 'regular-location', 'ACTIVE', false);
      const testLocation = await createLocation(tx, 'test-location', 'ACTIVE', true);
      const regularCat = await createCatFixture(tx, { name: unique('regular-cat'), sex: 'UNKNOWN', sterilizationStatus: 'UNKNOWN', currentLocationId: regularLocation.id, isTest: false });
      const service = createService(tx);

      await expect(service.updateCat(regularCat.id, { currentLocationId: testLocation.id }, undefined, false)).rejects.toThrow(NotFoundException);
      await expect(service.updateCat(regularCat.id, { name: 'Hidden Cat' }, undefined, true)).rejects.toThrow(NotFoundException);
    });
  });

  it('writes granular audit events only for changed cat fields', async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await createUser(tx, 'field-auditor');
      const card = await createCatFixture(tx, { name: 'Mila', sex: 'FEMALE', color: 'Calico', sterilizationStatus: 'UNKNOWN' });
      const service = createService(tx);

      await service.updateCat(card.id, { name: 'Luna', color: 'Calico', status: 'ADOPTED' }, actor.id);

      const events = await (tx as any).catAuditEvent.findMany({ where: { catId: card.id }, orderBy: { eventType: 'asc' } });
      expect(events.map((event: any) => event.eventType)).toEqual(['name_changed', 'status_changed']);
      expect(events).toEqual(expect.arrayContaining([
        expect.objectContaining({ actorUserId: actor.id, oldValue: 'Mila', newValue: 'Luna' }),
        expect.objectContaining({ actorUserId: actor.id, oldValue: 'ACTIVE', newValue: 'ADOPTED' }),
      ]));
    });
  });

  it('suppresses audit events for no-op and failed cat updates', async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await createUser(tx, 'suppression-auditor');
      const card = await createCatFixture(tx, { name: 'Mila', sex: 'FEMALE', sterilizationStatus: 'UNKNOWN' });
      const service = createService(tx);

      await service.updateCat(card.id, { name: 'Mila', sex: 'FEMALE' }, actor.id);
      await expect(service.updateCat(card.id, { sex: 'BAD' }, actor.id)).rejects.toThrow(BadRequestException);

      expect(await (tx as any).catAuditEvent.count({ where: { catId: card.id } })).toBe(0);
    });
  });

  it('writes photo-created and photo-deleted audit events while hiding deleted photos from the active gallery', async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await createUser(tx, 'photo-auditor');
      const card = await createCatFixture(tx, { name: 'Photo Audit Cat', sex: 'UNKNOWN', sterilizationStatus: 'UNKNOWN' });
      const service = createService(tx);

      const photo = await service.addPhoto(card.id, {
        originalname: 'audit.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('photo audit bytes'),
      }, actor.id);
      await service.deletePhoto(card.id, photo.id, actor.id);

      expect(await service.listPhotos(card.id)).toHaveLength(0);
      const storedPhoto = await (tx as any).catPhoto.findUnique({ where: { id: photo.id } });
      expect(storedPhoto).toMatchObject({ createdByUserId: actor.id, deletedByUserId: actor.id });
      expect(storedPhoto.deletedAt).toBeInstanceOf(Date);
      const events = await (tx as any).catAuditEvent.findMany({ where: { catId: card.id }, orderBy: { occurredAt: 'asc' } });
      expect(events.map((event: any) => event.eventType)).toEqual(['photo_created', 'photo_deleted']);
      expect(events.every((event: any) => event.photoId === photo.id && event.actorUserId === actor.id)).toBe(true);
    });
  });

  it('scopes child cat operations through the current user test status', async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await createUser(tx, 'child-scope-auditor');
      const regularCat = await createCatFixture(tx, { name: unique('regular-child'), sex: 'UNKNOWN', sterilizationStatus: 'UNKNOWN', isTest: false });
      const testCat = await createCatFixture(tx, { name: unique('test-child'), sex: 'UNKNOWN', sterilizationStatus: 'UNKNOWN', isTest: true });
      const service = createService(tx);
      const tag = await service.createTag({ name: `scope-${Math.random().toString(36).slice(2, 8)}` });

      await expect(service.addPhoto(regularCat.id, { originalname: 'blocked.jpg', mimetype: 'image/jpeg', buffer: Buffer.from('x') }, actor.id, true)).rejects.toThrow(NotFoundException);
      await expect(service.listPhotos(regularCat.id, true)).rejects.toThrow(NotFoundException);
      await expect(service.addWeight(regularCat.id, { weightKg: 4, measuredAt: '2026-07-30' }, true)).rejects.toThrow(NotFoundException);
      await expect(service.listWeights(regularCat.id, true)).rejects.toThrow(NotFoundException);
      await expect(service.addTag(regularCat.id, tag.id, true)).rejects.toThrow(NotFoundException);
      await expect(service.removeTag(regularCat.id, tag.id, true)).rejects.toThrow(NotFoundException);

      await expect(service.addPhoto(testCat.id, { originalname: 'allowed.jpg', mimetype: 'image/jpeg', buffer: Buffer.from('x') }, actor.id, true)).resolves.toMatchObject({ catId: testCat.id });
    });
  });

  it('adds, lists, and removes cat weight entries', async () => {
    await runInTestTransaction(async (tx) => {
      const card = await createCatFixture(tx, { name: 'Weight Cat', sex: 'FEMALE', sterilizationStatus: 'UNKNOWN' });

      const service = createService(tx);
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
  });

  it('creates reusable tags, attaches them to cats, and filters by tag', async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await createCatFixture(tx, { name: unique('tagged'), sex: 'FEMALE', sterilizationStatus: 'UNKNOWN' });
      const otherCat = await createCatFixture(tx, { name: unique('untagged'), sex: 'MALE', sterilizationStatus: 'UNKNOWN' });

      const service = createService(tx);
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
  });

  it('updates tag color and blocks deleting tags that are used by cats', async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await createCatFixture(tx, { name: unique('tagged-delete'), sex: 'FEMALE', sterilizationStatus: 'UNKNOWN' });
      const service = createService(tx);
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
  });

  it('returns 404 for missing cards and 400 for invalid pagination', async () => {
    await runInTestTransaction(async (tx) => {
      const service = createService(tx);
      await expect(service.findCardById('missing')).rejects.toThrow(NotFoundException);
      await expect(service.findAll({ limit: 101 })).rejects.toThrow(BadRequestException);
      await expect(service.findAll({ skip: -1 })).rejects.toThrow(BadRequestException);
    });
  });

  it('has migration-backed indexes, unique constraints, enum defaults, and nullable location on delete', async () => {
    await runInTestTransaction(async (tx) => {
      const indexes: Array<{ indexname: string }> = await tx.$queryRaw`
        SELECT indexname FROM pg_indexes WHERE tablename = 'Cat'
      `;
      expect(indexes.map((index) => index.indexname)).toEqual(
        expect.arrayContaining([
          'Cat_currentLocationId_idx',
          'Cat_isTest_idx',
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
  isTest = false,
) {
  return prisma.location.create({
    data: {
      name: unique(`cats-${namePrefix}`),
      status,
      isTest,
    },
  });
}

async function createUser(prisma: PrismaClient | Prisma.TransactionClient, prefix: string) {
  return prisma.user.create({
    data: { email: `${unique(prefix)}@example.com`, fullName: 'Audit Actor', status: 'ACTIVE' },
  });
}
