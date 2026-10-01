import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { PrismaService } from '../../database/prisma.service';
import { createBucket, deleteBucket, getS3Client, runInTestTransaction } from '../../test-utils/test-db';
import { CatPhotoUrlService } from '../cat-photo-url.service';
import { AddCatDocumentHandler } from './add-cat-document.handler';

describe('AddCatDocumentHandler', () => {
  let s3Client: S3Client;
  let bucket: string;
  let config: ConfigService;
  beforeAll(() => { s3Client = getS3Client(); });
  beforeEach(async () => {
    bucket = await createBucket('add-cat-document-handler', s3Client);
    config = new ConfigService();
    config.set('s3.bucketName', bucket);
  });
  afterEach(async () => { await deleteBucket(bucket, s3Client); });
  afterAll(() => s3Client.destroy());

  it('stores a validated PDF and writes a value-free audit event', async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({ data: { email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com` } });
      const cat = await tx.cat.create({ data: { name: `Cat ${Date.now()}-${Math.random().toString(36).slice(2)}` } });
      const result = await new AddCatDocumentHandler(tx as PrismaService, new CatPhotoUrlService(config, s3Client)).handle(cat.id, {
        originalname: 'record.pdf', mimetype: 'application/pdf', buffer: Buffer.from('%PDF-1.7 document'),
      }, actor.id, false);
      expect(result).toMatchObject({ catId: cat.id, fileName: 'record.pdf' });
      expect(result.url).toContain(`cats/${cat.id}/documents/`);
      await expect(tx.catAuditEvent.findFirstOrThrow({ where: { catId: cat.id } })).resolves.toMatchObject({ eventType: 'document_created', oldValue: null, newValue: null, documentId: result.id });
    });
  });

  it('rejects non-PDF content', async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({ data: { email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com` } });
      const cat = await tx.cat.create({ data: { name: `Cat ${Date.now()}-${Math.random().toString(36).slice(2)}` } });
      await expect(new AddCatDocumentHandler(tx as PrismaService, new CatPhotoUrlService(config, s3Client)).handle(cat.id, {
        originalname: 'not.pdf', mimetype: 'application/pdf', buffer: Buffer.from('not a PDF'),
      }, actor.id, false)).rejects.toThrow(BadRequestException);
    });
  });

  it('rejects a missing cat', async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({ data: { email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com` } });
      await expect(new AddCatDocumentHandler(tx as PrismaService, new CatPhotoUrlService(config, s3Client)).handle('missing', {
        originalname: 'doc.pdf', mimetype: 'application/pdf', buffer: Buffer.from('%PDF-1.0'),
      }, actor.id, false)).rejects.toThrow(NotFoundException);
    });
  });
});
