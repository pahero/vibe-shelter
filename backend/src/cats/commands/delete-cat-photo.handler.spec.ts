import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { PrismaService } from '../../database/prisma.service';
import { runInTestTransaction } from '../../test-utils/test-db';
import { CatPhotoUrlService } from '../cat-photo-url.service';
import { DeleteCatPhotoHandler } from './delete-cat-photo.handler';

describe('DeleteCatPhotoHandler', () => {
  const s3 = new S3Client({ region: 'us-east-1', credentials: { accessKeyId: 'unit-test', secretAccessKey: 'unit-test' } });
  const urls = new CatPhotoUrlService(new ConfigService(), s3);
  afterAll(() => s3.destroy());

  it('soft deletes and versions a photo and picks the next primary photo', async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({ data: { email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com` } });
      const cat = await tx.cat.create({ data: { name: `Cat ${Date.now()}-${Math.random().toString(36).slice(2)}` } });
      const first = await tx.catPhoto.create({ data: { catId: cat.id, key: 'first', createdAt: new Date(Date.now() - 1000) } });
      const second = await tx.catPhoto.create({ data: { catId: cat.id, key: 'second' } });
      await tx.cat.update({ where: { id: cat.id }, data: { primaryPhotoKey: second.key } });
      await new DeleteCatPhotoHandler(tx as PrismaService, urls).handle(cat.id, second.id, actor.id, false);
      await expect(tx.catPhoto.findUniqueOrThrow({ where: { id: second.id } })).resolves.toMatchObject({ deletedAt: expect.any(Date), version: 1, deletedByUserId: actor.id });
      await expect(tx.cat.findUniqueOrThrow({ where: { id: cat.id } })).resolves.toMatchObject({ primaryPhotoKey: first.key });
    });
  });

  it('rejects a missing photo', async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await tx.cat.create({ data: { name: `Cat ${Date.now()}-${Math.random().toString(36).slice(2)}` } });
      await expect(new DeleteCatPhotoHandler(tx as PrismaService, urls).handle(cat.id, 'missing', undefined, false)).rejects.toThrow(NotFoundException);
    });
  });
});
