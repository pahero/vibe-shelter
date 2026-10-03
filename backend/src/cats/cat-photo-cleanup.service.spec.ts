import { S3Client } from "@aws-sdk/client-s3";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../database/prisma.service";
import {
  createBucket,
  deleteBucket,
  getS3Client,
  runInTestTransaction,
} from "../test-utils/test-db";
import { CatPhotoCleanupService } from "./cat-photo-cleanup.service";
import { CatPhotoUrlService } from "./cat-photo-url.service";

describe("CatPhotoCleanupService", () => {
  let photoUrls: CatPhotoUrlService;
  let s3Client: S3Client;
  let config: ConfigService;
  let bucketName: string;

  beforeAll(async () => {
    s3Client = getS3Client();
    bucketName = await createBucket(
      `cat-photo-cleanup-${Math.random().toString(36).slice(2, 10)}`,
      s3Client,
    );
    config = new ConfigService();
    config.set("s3.bucketName", bucketName);
    photoUrls = new CatPhotoUrlService(config, s3Client);
  });

  afterEach(async () => {
    for (const { key } of await photoUrls.listPhotoObjects("")) {
      await photoUrls.deletePhoto(key);
    }
  });

  afterAll(async () => {
    await deleteBucket(bucketName, s3Client);
    s3Client.destroy();
  });

  it("deletes unreferenced S3 cat photos and keeps referenced photos", async () => {
    await runInTestTransaction(async (tx) => {
      const prisma = tx as PrismaService;
      const service = new CatPhotoCleanupService(prisma, photoUrls, config);
      const catId = `cleanup-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const prefix = `cats/${catId}/photos/`;
      config.set("S3_DANGLING_PHOTO_CLEANUP_GRACE_MS", "1");
      config.set("S3_DANGLING_PHOTO_CLEANUP_PREFIX", prefix);

      await tx.cat.create({ data: { id: catId, name: "Cleanup Cat" } });
      const referencedKey = await photoUrls.uploadPrimaryPhoto({
        catId,
        originalName: "referenced.jpg",
        body: Buffer.from("referenced"),
      });
      const danglingKey = await photoUrls.uploadPrimaryPhoto({
        catId,
        originalName: "dangling.jpg",
        body: Buffer.from("dangling"),
      });
      await tx.catPhoto.create({ data: { catId, key: referencedKey } });
      await new Promise((resolve) => setTimeout(resolve, 20));

      const result = await service.cleanupDanglingPhotos();

      expect(result.scanned).toBe(2);
      expect(result.deleted).toBe(1);
      expect(result.skippedReferenced).toBe(1);
      const remainingKeys = (await photoUrls.listPhotoObjects(prefix)).map(
        (item) => item.key,
      );
      expect(remainingKeys).toContain(referencedKey);
      expect(remainingKeys).not.toContain(danglingKey);
    });
  });

  it("keeps document objects referenced by active and soft-deleted documents", async () => {
    await runInTestTransaction(async (tx) => {
      const prisma = tx as PrismaService;
      const service = new CatPhotoCleanupService(prisma, photoUrls, config);
      const catId = `cleanup-document-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const prefix = `cats/${catId}/`;
      config.set("S3_DANGLING_PHOTO_CLEANUP_GRACE_MS", "1");
      config.set("S3_DANGLING_PHOTO_CLEANUP_PREFIX", prefix);

      await tx.cat.create({
        data: {
          id: catId,
          name: `Document Cleanup Cat ${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      });
      const activeKey = await photoUrls.uploadDocument({
        catId,
        originalName: "active.pdf",
        body: Buffer.from("%PDF-1.7\nactive"),
      });
      const deletedKey = await photoUrls.uploadDocument({
        catId,
        originalName: "deleted.pdf",
        body: Buffer.from("%PDF-1.7\ndeleted"),
      });
      const danglingKey = await photoUrls.uploadDocument({
        catId,
        originalName: "dangling.pdf",
        body: Buffer.from("%PDF-1.7\ndangling"),
      });
      await tx.catDocument.createMany({
        data: [
          { catId, key: activeKey, fileName: "active.pdf" },
          {
            catId,
            key: deletedKey,
            fileName: "deleted.pdf",
            deletedAt: new Date(),
          },
        ],
      });
      await new Promise((resolve) => setTimeout(resolve, 20));

      const result = await service.cleanupDanglingPhotos();

      expect(result.scanned).toBe(3);
      expect(result.deleted).toBe(1);
      expect(result.skippedReferenced).toBe(2);
      const remainingKeys = (await photoUrls.listPhotoObjects(prefix)).map(
        (item) => item.key,
      );
      expect(remainingKeys).toEqual(
        expect.arrayContaining([activeKey, deletedKey]),
      );
      expect(remainingKeys).not.toContain(danglingKey);
    });
  });
});
