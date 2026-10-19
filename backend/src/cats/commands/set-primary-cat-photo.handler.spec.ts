import { NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client } from "@aws-sdk/client-s3";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { CatPhotoUrlService } from "../cat-photo-url.service";
import { SetPrimaryCatPhotoHandler } from "./set-primary-cat-photo.handler";

describe("SetPrimaryCatPhotoHandler", () => {
  const s3 = new S3Client({
    region: "us-east-1",
    credentials: { accessKeyId: "unit-test", secretAccessKey: "unit-test" },
  });
  const urls = new CatPhotoUrlService(new ConfigService(), s3);
  afterAll(() => s3.destroy());

  it("sets an active photo as primary", async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await tx.cat.create({
        data: {
          name: `Cat ${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      });
      const photo = await tx.catPhoto.create({
        data: { catId: cat.id, key: "primary-key" },
      });
      await new SetPrimaryCatPhotoHandler(tx as PrismaService, urls).handle(
        cat.id,
        photo.id,
        28,
        undefined,
        false,
      );
      await expect(
        tx.cat.findUniqueOrThrow({ where: { id: cat.id } }),
      ).resolves.toMatchObject({
        primaryPhotoKey: "primary-key",
        primaryPhotoPositionY: 28,
      });
      await expect(tx.auditEvent.count({ where: { catId: cat.id } })).resolves.toBe(0);
    });
  });

  it("resets the position when replacing the primary photo without a coordinate", async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await tx.cat.create({
        data: {
          name: `Cat ${Date.now()}-${Math.random().toString(36).slice(2)}`,
          primaryPhotoKey: "old-key",
          primaryPhotoPositionY: 16,
        },
      });
      const photo = await tx.catPhoto.create({
        data: { catId: cat.id, key: "new-primary-key" },
      });
      await new SetPrimaryCatPhotoHandler(tx as PrismaService, urls).handle(
        cat.id,
        photo.id,
        undefined,
        undefined,
        false,
      );
      await expect(
        tx.cat.findUniqueOrThrow({ where: { id: cat.id } }),
      ).resolves.toMatchObject({
        primaryPhotoKey: "new-primary-key",
        primaryPhotoPositionY: null,
      });
    });
  });

  it("preserves the position when the same primary photo is selected without a coordinate", async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await tx.cat.create({
        data: {
          name: `Cat ${Date.now()}-${Math.random().toString(36).slice(2)}`,
          primaryPhotoKey: "current-key",
          primaryPhotoPositionY: 37,
        },
      });
      const photo = await tx.catPhoto.create({
        data: { catId: cat.id, key: "current-key" },
      });
      await new SetPrimaryCatPhotoHandler(tx as PrismaService, urls).handle(
        cat.id,
        photo.id,
        undefined,
        undefined,
        false,
      );
      await expect(
        tx.cat.findUniqueOrThrow({ where: { id: cat.id } }),
      ).resolves.toMatchObject({ primaryPhotoPositionY: 37 });
    });
  });

  it("rejects an inactive or unrelated photo", async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await tx.cat.create({
        data: {
          name: `Cat ${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      });
      await expect(
        new SetPrimaryCatPhotoHandler(tx as PrismaService, urls).handle(
           cat.id,
           "missing",
           undefined,
           undefined,
           false,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  it("rejects a missing cat", async () => {
    await runInTestTransaction(async (tx) => {
      await expect(
        new SetPrimaryCatPhotoHandler(tx as PrismaService, urls).handle(
          "missing-cat",
          "missing-photo",
          undefined,
          undefined,
          false,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
