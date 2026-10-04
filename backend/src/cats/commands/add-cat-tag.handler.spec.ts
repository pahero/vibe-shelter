import { NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client } from "@aws-sdk/client-s3";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { CatPhotoUrlService } from "../cat-photo-url.service";
import { AddCatTagHandler } from "./add-cat-tag.handler";

describe("AddCatTagHandler", () => {
  const s3 = new S3Client({
    region: "us-east-1",
    credentials: { accessKeyId: "unit-test", secretAccessKey: "unit-test" },
  });
  const urls = new CatPhotoUrlService(new ConfigService(), s3);
  afterAll(() => s3.destroy());

  it("upserts the assignment, audits it, and returns the populated card", async () => {
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
      const tag = await tx.catTag.create({
        data: {
          name: `Tag ${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      });
      const result = await new AddCatTagHandler(
        tx as PrismaService,
        urls,
      ).handle(cat.id, tag.id, actor.id, false);
      expect(result.tags).toEqual([
        { id: tag.id, name: tag.name, color: tag.color },
      ]);
      await expect(
        tx.auditEvent.findFirstOrThrow({
          where: { catId: cat.id, tagId: tag.id },
        }),
      ).resolves.toMatchObject({ eventType: "tag_added_to_cat" });
    });
  });

  it("rejects a cat outside the current partition", async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await tx.cat.create({
        data: {
          name: `Test ${Date.now()}-${Math.random().toString(36).slice(2)}`,
          isTest: true,
        },
      });
      await expect(
        new AddCatTagHandler(tx as PrismaService, urls).handle(
          cat.id,
          "tag",
          undefined,
          false,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  it("rejects a tag from the other partition", async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await tx.cat.create({
        data: { name: `Test ${Date.now()}`, isTest: true },
      });
      const tag = await tx.catTag.create({
        data: { name: `Regular ${Date.now()}`, isTest: false },
      });

      await expect(
        new AddCatTagHandler(tx as PrismaService, urls).handle(
          cat.id,
          tag.id,
          undefined,
          true,
        ),
      ).rejects.toThrow(NotFoundException);
      await expect(
        tx.catTagOnCat.count({ where: { catId: cat.id, tagId: tag.id } }),
      ).resolves.toBe(0);
    });
  });
});
