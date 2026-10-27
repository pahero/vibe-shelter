import { NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client } from "@aws-sdk/client-s3";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { CatPhotoUrlService } from "../cat-photo-url.service";
import { GetCatCardHandler } from "./get-cat-card.handler";

describe("GetCatCardHandler", () => {
  const s3 = new S3Client({
    region: "us-east-1",
    credentials: { accessKeyId: "unit-test", secretAccessKey: "unit-test" },
  });
  const photoUrls = new CatPhotoUrlService(new ConfigService(), s3);
  afterAll(() => s3.destroy());

  it("returns the requested cat card for its test partition", async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await tx.cat.create({
        data: {
          name: `Card ${Date.now()}-${Math.random().toString(36).slice(2)}`,
          adopterName: "Foster",
        },
      });
      await expect(
        new GetCatCardHandler(tx as PrismaService, photoUrls).handle(
          cat.id,
          false,
        ),
      ).resolves.toMatchObject({ id: cat.id, adopterName: "Foster", tags: [] });
    });
  });

  it("includes favorite status for the requesting user", async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({ data: { email: `${crypto.randomUUID()}@example.com` } });
      const cat = await tx.cat.create({ data: { name: `Favorite card ${crypto.randomUUID()}` } });
      await tx.catFavorite.create({ data: { userId: user.id, catId: cat.id } });
      await expect(new GetCatCardHandler(tx as PrismaService, photoUrls).handle(cat.id, false, user.id)).resolves.toMatchObject({ id: cat.id, isFavorite: true });
    });
  });

  it("does not expose another user's favorite state", async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({ data: { email: `${crypto.randomUUID()}@example.com` } });
      const otherUser = await tx.user.create({ data: { email: `${crypto.randomUUID()}@example.com` } });
      const cat = await tx.cat.create({ data: { name: `Private favorite ${crypto.randomUUID()}` } });
      await tx.catFavorite.create({ data: { userId: user.id, catId: cat.id } });
      await expect(new GetCatCardHandler(tx as PrismaService, photoUrls).handle(cat.id, false, otherUser.id)).resolves.toMatchObject({ id: cat.id, isFavorite: false });
    });
  });

  it("hides cats from the opposite test partition", async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await tx.cat.create({
        data: {
          name: `Test ${Date.now()}-${Math.random().toString(36).slice(2)}`,
          isTest: true,
        },
      });
      await expect(
        new GetCatCardHandler(tx as PrismaService, photoUrls).handle(
          cat.id,
          false,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  it("rejects a blank ID", async () => {
    await runInTestTransaction(async (tx) => {
      await expect(
        new GetCatCardHandler(tx as PrismaService, photoUrls).handle(
          " ",
          false,
        ),
      ).rejects.toThrow("Cat ID is required");
    });
  });
});
