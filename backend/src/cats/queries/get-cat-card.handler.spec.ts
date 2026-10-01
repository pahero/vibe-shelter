import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { PrismaService } from '../../database/prisma.service';
import { runInTestTransaction } from '../../test-utils/test-db';
import { CatPhotoUrlService } from '../cat-photo-url.service';
import { GetCatCardHandler } from './get-cat-card.handler';

describe('GetCatCardHandler', () => {
  const s3 = new S3Client({ region: 'us-east-1', credentials: { accessKeyId: 'unit-test', secretAccessKey: 'unit-test' } });
  const photoUrls = new CatPhotoUrlService(new ConfigService(), s3);
  afterAll(() => s3.destroy());

  it('returns the requested cat card for its test partition', async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await tx.cat.create({ data: { name: `Card ${Date.now()}-${Math.random().toString(36).slice(2)}`, adopterName: 'Foster' } });
      await expect(new GetCatCardHandler(tx as PrismaService, photoUrls).handle(cat.id, false)).resolves.toMatchObject({ id: cat.id, adopterName: 'Foster', tags: [] });
    });
  });

  it('hides cats from the opposite test partition', async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await tx.cat.create({ data: { name: `Test ${Date.now()}-${Math.random().toString(36).slice(2)}`, isTest: true } });
      await expect(new GetCatCardHandler(tx as PrismaService, photoUrls).handle(cat.id, false)).rejects.toThrow(NotFoundException);
    });
  });

  it('rejects a blank ID', async () => {
    await runInTestTransaction(async (tx) => {
      await expect(new GetCatCardHandler(tx as PrismaService, photoUrls).handle(' ', false)).rejects.toThrow('Cat ID is required');
    });
  });
});
