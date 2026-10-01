import { NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client } from "@aws-sdk/client-s3";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { CatPhotoUrlService } from "../cat-photo-url.service";
import { ListCatDocumentsHandler } from "./list-cat-documents.handler";

describe("ListCatDocumentsHandler", () => {
  const s3 = new S3Client({
    region: "us-east-1",
    credentials: { accessKeyId: "unit-test", secretAccessKey: "unit-test" },
  });
  const urls = new CatPhotoUrlService(new ConfigService(), s3);
  afterAll(() => s3.destroy());

  it("lists active documents in stable order", async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await tx.cat.create({
        data: {
          name: `Cat ${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      });
      const doc = await tx.catDocument.create({
        data: { catId: cat.id, key: "doc-key", fileName: "record.pdf" },
      });
      await tx.catDocument.create({
        data: {
          catId: cat.id,
          key: "deleted-key",
          fileName: "deleted.pdf",
          deletedAt: new Date(),
        },
      });
      const result = await new ListCatDocumentsHandler(
        tx as PrismaService,
        urls,
      ).handle(cat.id, false);
      expect(result).toEqual([
        expect.objectContaining({ id: doc.id, fileName: "record.pdf" }),
      ]);
    });
  });

  it("rejects missing cats", async () => {
    await runInTestTransaction(async (tx) => {
      await expect(
        new ListCatDocumentsHandler(tx as PrismaService, urls).handle(
          "missing",
          false,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
