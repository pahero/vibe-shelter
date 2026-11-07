import { NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client } from "@aws-sdk/client-s3";
import { Prisma } from "@prisma/client";
import sharp from "sharp";
import { PrismaService } from "../../database/prisma.service";
import {
  createBucket,
  deleteBucket,
  getS3Client,
  runInTestTransaction,
} from "../../test-utils/test-db";
import { CatPhotoUrlService } from "../cat-photo-url.service";
import { TrelloCard, TrelloClient } from "./trello-client";
import { ImportTrelloAttachmentsHandler } from "./import-trello-attachments.handler";

let s3Client: S3Client;

describe("ImportTrelloAttachmentsHandler", () => {
  beforeAll(() => {
    s3Client = getS3Client();
  });

  afterAll(() => s3Client.destroy());

  it("adds card photos and documents to the cat linked to the same Trello URL", async () => {
    let bucketName: string | undefined;
    try {
      bucketName = await createBucket("trello-attachments-existing", s3Client);
      const jpeg = await sharp({
        create: {
          width: 1,
          height: 1,
          channels: 3,
          background: "white",
        },
      })
        .jpeg()
        .toBuffer();
      await runInTestTransaction(async (tx) => {
        const actorId = await createActor(tx);
        const shortId = crypto.randomUUID().replaceAll("-", "");
        const trelloUrl = `https://trello.com/c/${shortId}`;
        const cat = await tx.cat.create({
          data: {
            name: `Trello attachments ${shortId}`,
            currentLocation: { create: { name: `Trello location ${shortId}` } },
            trelloUrl,
          },
        });
        const oldPhoto = await tx.catPhoto.create({
          data: {
            catId: cat.id,
            key: `cats/${cat.id}/photos/old.jpg`,
            fileName: "old.jpg",
          },
        });
        const oldDocument = await tx.catDocument.create({
          data: {
            catId: cat.id,
            key: `cats/${cat.id}/documents/old.pdf`,
            fileName: "old.pdf",
          },
        });
        await tx.cat.update({
          where: { id: cat.id },
          data: { primaryPhotoKey: oldPhoto.key },
        });
        const card = makeCard(shortId, [
          {
            name: "passport.pdf",
            url: `https://trello.com/attachment/${shortId}/passport.pdf`,
            mimeType: "application/pdf",
          },
          {
            name: "portrait.jpg",
            url: `https://trello.com/attachment/${shortId}/portrait.jpg`,
            mimeType: "image/jpeg",
          },
        ]);
        const trello = new TestTrelloClient(card, async (url) =>
          url.endsWith(".pdf")
            ? {
                bytes: Buffer.from("%PDF-1.4 test"),
                contentType: "application/pdf",
              }
            : { bytes: jpeg, contentType: "image/jpeg" },
        );
        const photoUrls = new CatPhotoUrlService(
          new ConfigService({ s3: { bucketName } }),
          s3Client,
        );
        const before = await tx.cat.findUniqueOrThrow({
          where: { id: cat.id },
          select: { version: true, concurrencyToken: true },
        });

        await expect(
          new ImportTrelloAttachmentsHandler(
            tx as PrismaService,
            trello,
            photoUrls,
          ).handle(`${trelloUrl}/card-name`, actorId, false),
        ).resolves.toEqual({ id: cat.id });

        await expect(
          tx.catPhoto.findMany({
            where: { catId: cat.id, deletedAt: null },
          }),
        ).resolves.toMatchObject([
          {
            fileName: "portrait.jpg",
            createdByUserId: actorId,
            previewKey: expect.any(String),
          },
        ]);
        await expect(
          tx.catDocument.findMany({
            where: { catId: cat.id, deletedAt: null },
          }),
        ).resolves.toMatchObject([
          { fileName: "passport.pdf", createdByUserId: actorId },
        ]);
        const updatedCat = await tx.cat.findUniqueOrThrow({
          where: { id: cat.id },
        });
        expect(updatedCat).toMatchObject({
          primaryPhotoKey: expect.any(String),
          version: before.version + 1,
        });
        expect(updatedCat.concurrencyToken).not.toBe(before.concurrencyToken);
        await expect(
          tx.catPhoto.findUniqueOrThrow({ where: { id: oldPhoto.id } }),
        ).resolves.toMatchObject({ deletedAt: expect.any(Date), version: 1 });
        await expect(
          tx.catDocument.findUniqueOrThrow({ where: { id: oldDocument.id } }),
        ).resolves.toMatchObject({ deletedAt: expect.any(Date), version: 2 });
        const events = await tx.auditEvent.findMany({
          where: { catId: cat.id },
        });
        expect(events.map((event) => event.eventType)).toEqual(
          expect.arrayContaining(["document_created", "photo_created"]),
        );
      });
    } finally {
      if (bucketName) await deleteBucket(bucketName, s3Client);
    }
  });

  it("shows not found when no cat is linked to the Trello card", async () => {
    await runInTestTransaction(async (tx) => {
      const shortId = crypto.randomUUID().replaceAll("-", "");
      const trelloUrl = `https://trello.com/c/${shortId}`;
      await tx.cat.create({
        data: {
          name: `Test-only cat ${shortId}`,
          isTest: true,
          trelloUrl,
          currentLocation: {
            create: { name: `Test-only location ${shortId}`, isTest: true },
          },
        },
      });
      const trello = new TestTrelloClient(makeCard(shortId, []), async () => {
        throw new Error("Should not download when the linked cat is missing");
      });
      const handler = new ImportTrelloAttachmentsHandler(
        tx as PrismaService,
        trello,
        new CatPhotoUrlService(new ConfigService(), s3Client),
      );

      await expect(
        handler.handle(`https://trello.com/c/${shortId}`, "unused-user", false),
      ).rejects.toThrow(NotFoundException);
    });
  });

  it("soft-deletes all existing files when the Trello card has no attachments", async () => {
    await runInTestTransaction(async (tx) => {
      const actorId = await createActor(tx);
      const shortId = crypto.randomUUID().replaceAll("-", "");
      const cat = await tx.cat.create({
        data: {
          name: `Trello empty ${shortId}`,
          currentLocation: {
            create: { name: `Trello empty location ${shortId}` },
          },
          trelloUrl: `https://trello.com/c/${shortId}`,
        },
      });
      const before = await tx.cat.findUniqueOrThrow({
        where: { id: cat.id },
        select: { version: true, concurrencyToken: true },
      });
      const photo = await tx.catPhoto.create({
        data: {
          catId: cat.id,
          key: `cats/${cat.id}/photos/only.jpg`,
          fileName: "only.jpg",
        },
      });
      const document = await tx.catDocument.create({
        data: {
          catId: cat.id,
          key: `cats/${cat.id}/documents/only.pdf`,
          fileName: "only.pdf",
        },
      });
      await tx.cat.update({
        where: { id: cat.id },
        data: { primaryPhotoKey: photo.key },
      });
      const handler = new ImportTrelloAttachmentsHandler(
        tx as PrismaService,
        new TestTrelloClient(makeCard(shortId, []), async () => ({
          bytes: Buffer.alloc(0),
          contentType: "application/octet-stream",
        })),
        new CatPhotoUrlService(new ConfigService(), s3Client),
      );

      await expect(
        handler.handle(`https://trello.com/c/${shortId}`, actorId, false),
      ).resolves.toEqual({ id: cat.id });
      await expect(
        tx.cat.findUniqueOrThrow({ where: { id: cat.id } }),
      ).resolves.toMatchObject({
        version: before.version + 1,
        primaryPhotoKey: null,
      });
      const [deletedPhoto, deletedDocument, events] = await Promise.all([
        tx.catPhoto.findUniqueOrThrow({ where: { id: photo.id } }),
        tx.catDocument.findUniqueOrThrow({ where: { id: document.id } }),
        tx.auditEvent.findMany({ where: { catId: cat.id } }),
      ]);
      expect(deletedPhoto.deletedAt).toBeInstanceOf(Date);
      expect(deletedDocument.deletedAt).toBeInstanceOf(Date);
      expect(events.map((event) => event.eventType)).toEqual(
        expect.arrayContaining(["photo_deleted", "document_deleted"]),
      );
    });
  });
});

class TestTrelloClient extends TrelloClient {
  constructor(
    private readonly card: TrelloCard,
    private readonly download: (url: string) => Promise<{
      bytes: Buffer;
      contentType: string;
    }>,
  ) {
    super(new ConfigService());
  }

  override async getCard(): Promise<TrelloCard> {
    return this.card;
  }

  override async downloadAttachment(url: string) {
    return this.download(url);
  }
}

async function createActor(tx: Prisma.TransactionClient): Promise<string> {
  const user = await tx.user.create({
    data: {
      fullName: "Trello attachment import test",
      email: `${crypto.randomUUID()}@example.test`,
    },
    select: { id: true },
  });
  return user.id;
}

function makeCard(
  shortId: string,
  attachments: TrelloCard["attachments"],
): TrelloCard {
  return {
    id: `0123456789abcdef${shortId.slice(0, 8)}`,
    name: "Existing Trello cat",
    url: `https://trello.com/c/${shortId}/existing-trello-cat`,
    shortUrl: `https://trello.com/c/${shortId}`,
    desc: "",
    idLabels: [],
    checklists: [],
    attachments,
  };
}
