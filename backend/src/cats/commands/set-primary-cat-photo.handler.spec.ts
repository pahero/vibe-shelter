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
        false,
      );
      await expect(
        tx.cat.findUniqueOrThrow({ where: { id: cat.id } }),
      ).resolves.toMatchObject({ primaryPhotoKey: "primary-key" });
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
          false,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
