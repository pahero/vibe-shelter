import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { PrismaService } from '../../database/prisma.service';
import { runInTestTransaction } from '../../test-utils/test-db';
import { CatPhotoUrlService } from '../cat-photo-url.service';
import { ListCatPhotosHandler } from './list-cat-photos.handler';

describe('ListCatPhotosHandler', () => {
  const s3 = new S3Client({ region: 'us-east-1', credentials: { accessKeyId: 'unit-test', secretAccessKey: 'unit-test' } });
  const urls = new CatPhotoUrlService(new ConfigService(), s3);
  afterAll(() => s3.destroy());

  it('lists active photos and marks the primary photo', async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await tx.cat.create({ data: { name: `Cat ${Date.now()}-${Math.random().toString(36).slice(2)}` } });
      const photo = await tx.catPhoto.create({ data: { catId: cat.id, key: `cats/${cat.id}/photos/one.jpg` } });
      await tx.cat.update({ where: { id: cat.id }, data: { primaryPhotoKey: photo.key } });
      await tx.catPhoto.create({ data: { catId: cat.id, key: `cats/${cat.id}/photos/deleted.jpg`, deletedAt: new Date() } });
      const result = await new ListCatPhotosHandler(tx as PrismaService, urls).handle(cat.id, false);
      expect(result).toEqual([expect.objectContaining({ id: photo.id, isPrimary: true })]);
    });
  });

  it('rejects a missing cat', async () => {
    await runInTestTransaction(async (tx) => {
      await expect(new ListCatPhotosHandler(tx as PrismaService, urls).handle('missing', false)).rejects.toThrow(NotFoundException);
    });
  });
});
