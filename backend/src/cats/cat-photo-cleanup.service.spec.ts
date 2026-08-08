import { S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { beginTestTransaction, getS3Client, rollbackTestTransaction, startTestDatabase } from '../test-utils/test-db';
import { CatPhotoCleanupService } from './cat-photo-cleanup.service';
import { CatPhotoUrlService } from './cat-photo-url.service';

describe('CatPhotoCleanupService', () => {
  let service: CatPhotoCleanupService;
  let photoUrls: CatPhotoUrlService;
  let prisma: PrismaService;
  let s3Client: S3Client;
  let config: ConfigService;
  const uploadedKeys: string[] = [];

  beforeAll(async () => {
    prisma = await startTestDatabase();
    s3Client = getS3Client();
    config = new ConfigService();
    config.set('s3.bucketName', process.env.S3_BUCKET);
    photoUrls = new CatPhotoUrlService(config, s3Client);
    service = new CatPhotoCleanupService(prisma, photoUrls, config);
  });

  beforeEach(async () => {
    await beginTestTransaction(prisma);
  });

  afterEach(async () => {
    await rollbackTestTransaction(prisma);
    for (const key of uploadedKeys.splice(0)) {
      await photoUrls.deletePhoto(key);
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
    s3Client.destroy();
  });

  it('deletes unreferenced S3 cat photos and keeps referenced photos', async () => {
    const catId = `cleanup-${Date.now()}`;
    const prefix = `cats/${catId}/photos/`;
    jest.spyOn(config, 'get').mockImplementation((name: string) => {
      if (name === 'S3_DANGLING_PHOTO_CLEANUP_GRACE_MS') return '1';
      if (name === 'S3_DANGLING_PHOTO_CLEANUP_PREFIX') return prefix;
      return process.env[name];
    });

    await (prisma as any).cat.create({ data: { id: catId, name: 'Cleanup Cat' } });
    const referencedKey = await photoUrls.uploadPrimaryPhoto({ catId, originalName: 'referenced.jpg', body: Buffer.from('referenced') });
    const danglingKey = await photoUrls.uploadPrimaryPhoto({ catId, originalName: 'dangling.jpg', body: Buffer.from('dangling') });
    uploadedKeys.push(referencedKey, danglingKey);
    await (prisma as any).catPhoto.create({ data: { catId, key: referencedKey } });
    await new Promise((resolve) => setTimeout(resolve, 20));

    const result = await service.cleanupDanglingPhotos();

    expect(result.scanned).toBeGreaterThanOrEqual(2);
    expect(result.deleted).toBe(1);
    expect(result.skippedReferenced).toBe(1);
    const remainingKeys = (await photoUrls.listPhotoObjects(prefix)).map((item) => item.key);
    expect(remainingKeys).toContain(referencedKey);
    expect(remainingKeys).not.toContain(danglingKey);
    uploadedKeys.splice(uploadedKeys.indexOf(danglingKey), 1);
  });
});
