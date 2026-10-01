import { NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client } from "@aws-sdk/client-s3";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { CatPhotoUrlService } from "../cat-photo-url.service";
import { RemoveCatTagHandler } from "./remove-cat-tag.handler";

describe("RemoveCatTagHandler", () => {
  const s3 = new S3Client({
    region: "us-east-1",
    credentials: { accessKeyId: "unit-test", secretAccessKey: "unit-test" },
  });
  const urls = new CatPhotoUrlService(new ConfigService(), s3);
  afterAll(() => s3.destroy());

  it("removes the assignment and writes a value-free audit event", async () => {
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
      await tx.catTagOnCat.create({ data: { catId: cat.id, tagId: tag.id } });
      const result = await new RemoveCatTagHandler(
        tx as PrismaService,
        urls,
      ).handle(cat.id, tag.id, actor.id, false);
      expect(result.tags).toEqual([]);
      await expect(
        tx.catAuditEvent.findFirstOrThrow({
          where: { catId: cat.id, tagId: tag.id },
        }),
      ).resolves.toMatchObject({
        eventType: "tag_removed_from_cat",
        oldValue: null,
        newValue: null,
      });
    });
  });

  it("rejects cats outside the current partition", async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await tx.cat.create({
        data: {
          name: `Test ${Date.now()}-${Math.random().toString(36).slice(2)}`,
          isTest: true,
        },
      });
      await expect(
        new RemoveCatTagHandler(tx as PrismaService, urls).handle(
          cat.id,
          "tag",
          undefined,
          false,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
