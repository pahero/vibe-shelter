import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { PrismaService } from '../../database/prisma.service';
import { createBucket, deleteBucket, getS3Client, runInTestTransaction } from '../../test-utils/test-db';
import { CatPhotoUrlService } from '../cat-photo-url.service';
import { UpdatePrimaryCatPhotoHandler } from './update-primary-cat-photo.handler';

describe('UpdatePrimaryCatPhotoHandler', () => {
  let s3Client: S3Client;
  let bucket: string;
  let config: ConfigService;
  beforeAll(() => { s3Client = getS3Client(); });
  beforeEach(async () => {
    bucket = await createBucket('update-primary-cat-photo', s3Client);
    config = new ConfigService();
    config.set('s3.bucketName', bucket);
  });
  afterEach(async () => { await deleteBucket(bucket, s3Client); });
  afterAll(() => s3Client.destroy());

  it('creates a photo and sets it as primary', async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await tx.cat.create({ data: { name: `Cat ${Date.now()}-${Math.random().toString(36).slice(2)}` } });
      const result = await new UpdatePrimaryCatPhotoHandler(tx as PrismaService, new CatPhotoUrlService(config, s3Client)).handle(cat.id, {
        originalname: 'portrait.jpg', mimetype: 'image/jpeg', buffer: Buffer.from('not an image'),
      }, undefined, false);
      expect(result.primaryPhotoUrl).toContain(`cats/${cat.id}/photos/`);
      await expect(tx.catPhoto.count({ where: { catId: cat.id, deletedAt: null } })).resolves.toBe(1);
    });
  });

  it('rejects a missing upload', async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await tx.cat.create({ data: { name: `Cat ${Date.now()}-${Math.random().toString(36).slice(2)}` } });
      await expect(new UpdatePrimaryCatPhotoHandler(tx as PrismaService, new CatPhotoUrlService(config, s3Client)).handle(cat.id, undefined, undefined, false)).rejects.toThrow(BadRequestException);
    });
  });
});
