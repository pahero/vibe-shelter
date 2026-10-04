import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client } from "@aws-sdk/client-s3";
import { PrismaService } from "../../database/prisma.service";
import {
  createBucket,
  deleteBucket,
  getS3Client,
  runInTestTransaction,
} from "../../test-utils/test-db";
import { CatPhotoUrlService } from "../cat-photo-url.service";
import { AddCatPhotoHandler } from "./add-cat-photo.handler";

describe("AddCatPhotoHandler", () => {
  let s3Client: S3Client;
  let bucket: string;
  let config: ConfigService;
  beforeAll(() => {
    s3Client = getS3Client();
  });
  beforeEach(async () => {
    bucket = await createBucket("add-cat-photo-handler", s3Client);
    config = new ConfigService();
    config.set("s3.bucketName", bucket);
  });
  afterEach(async () => {
    await deleteBucket(bucket, s3Client);
  });
  afterAll(() => s3Client.destroy());

  it("uploads a photo, makes the first photo primary, and emits a lifecycle audit event", async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({
        data: {
          email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`,
        },
      });
      const cat = await tx.cat.create({
        data: {
          name: `Cat ${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      });
      const result = await new AddCatPhotoHandler(
        tx as PrismaService,
        new CatPhotoUrlService(config, s3Client),
      ).handle(
        cat.id,
        {
          originalname: "first.jpg",
          mimetype: "image/jpeg",
          buffer: Buffer.from("invalid image bytes"),
        },
        actor.id,
        false,
      );
      expect(result).toMatchObject({ catId: cat.id, isPrimary: true });
      await expect(
        tx.cat.findUniqueOrThrow({ where: { id: cat.id } }),
      ).resolves.toMatchObject({
        primaryPhotoKey: expect.stringContaining(cat.id),
      });
      await expect(
        tx.auditEvent.findFirstOrThrow({ where: { catId: cat.id } }),
      ).resolves.toMatchObject({
        eventType: "photo_created",
        photoId: result.id,
        oldValue: null,
        newValue: null,
      });
    });
  });

  it("rejects a missing cat before storing a photo", async () => {
    await runInTestTransaction(async (tx) => {
      await expect(
        new AddCatPhotoHandler(
          tx as PrismaService,
          new CatPhotoUrlService(config, s3Client),
        ).handle(
          "missing",
          {
            originalname: "photo.jpg",
            mimetype: "image/jpeg",
            buffer: Buffer.from("data"),
          },
          undefined,
          false,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  it("rejects an empty upload", async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await tx.cat.create({
        data: {
          name: `Cat ${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      });
      await expect(
        new AddCatPhotoHandler(
          tx as PrismaService,
          new CatPhotoUrlService(config, s3Client),
        ).handle(cat.id, undefined, undefined, false),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
