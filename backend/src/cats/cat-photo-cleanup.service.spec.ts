import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import configuration from '../config/configuration';
import { PrismaService } from '../database/prisma.service';
import { beginTestTransaction, rollbackTestTransaction, startTestDatabase } from '../test-utils/test-db';
import { CatPhotoCleanupService } from './cat-photo-cleanup.service';
import { CatPhotoUrlService } from './cat-photo-url.service';

describe('CatPhotoCleanupService', () => {
  let moduleRef: TestingModule;
  let service: CatPhotoCleanupService;
  let photoUrls: CatPhotoUrlService;
  let prisma: PrismaService;
  const uploadedKeys: string[] = [];

  beforeAll(async () => {
    prisma = await startTestDatabase();
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ load: [configuration], isGlobal: true })],
      providers: [
        CatPhotoCleanupService,
        CatPhotoUrlService,
        { provide: PrismaService, useValue: prisma },
        ConfigModule
      ]
    }).compile();
    service = moduleRef.get(CatPhotoCleanupService);
    photoUrls = moduleRef.get(CatPhotoUrlService);
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
    await moduleRef.close();
    await prisma.$disconnect();
  });

  it('deletes unreferenced S3 cat photos and keeps referenced photos', async () => {
    const catId = `cleanup-${Date.now()}`;
    const prefix = `cats/${catId}/photos/`;
    const config = moduleRef.get(ConfigService);
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
