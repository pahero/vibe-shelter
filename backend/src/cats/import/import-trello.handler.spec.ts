import { ConflictException } from "@nestjs/common";
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
import { ImportTrelloHandler } from "./import-trello.handler";

let s3Client: S3Client;
let photoUrls: CatPhotoUrlService;

describe("ImportTrelloHandler", () => {
  beforeAll(() => {
    s3Client = getS3Client();
    photoUrls = new CatPhotoUrlService(new ConfigService(), s3Client);
  });

  afterAll(() => s3Client.destroy());

  it("imports card fields, tags, vaccines, location and value-free cat creation audit", async () => {
    await runInTestTransaction(async (tx) => {
      const actorId = await createActor(tx);
      const card = sampleCard({
        name: "Momo #27",
        desc: "Location: Sanctuary\nSponsored by: CCLAF\nKitten no. 5 (2026)\nFound near the river",
        labels: [
          { id: "1", name: "female" },
          { id: "2", name: "neutered" },
          { id: "3", name: "CCLAF" },
          { id: "4", name: "rabies" },
          { id: "5", name: "sick" },
        ],
        checklists: [
          {
            name: "Documents",
            checkItems: [
              { name: "EU passport", state: "complete" },
              { name: "FIV test", state: "complete" },
              { name: "Microchip 956000018355049", state: "complete" },
            ],
          },
          {
            name: "Vaccination",
            checkItems: [{ name: "1st vaccination", state: "complete" }],
          },
        ],
      });
      await tx.catTag.create({
        data: { name: "CCLAF", deletedAt: new Date() },
      });
      await tx.catTag.create({ data: { name: "sick" } });
      const result = await handler(tx as PrismaService, card).handle(
        "https://trello.com/c/card123",
        actorId,
        false,
      );

      const cat = await tx.cat.findUniqueOrThrow({ where: { id: result.id } });
      expect(cat).toMatchObject({
        name: "Momo",
        nameNumber: 27,
        trelloUrl: card.shortUrl,
        sex: "FEMALE",
        sterilizationStatus: "STERILIZED",
        sponsorName: "CCLAF",
        intakeDetails:
          "Location: Sanctuary\nSponsored by: CCLAF\nKitten no. 5 (2026)\nFound near the river",
        microchipNumber: "956000018355049",
        passport: true,
        felvFivTestDone: true,
      });
      await expect(
        tx.location.findUniqueOrThrow({ where: { id: cat.currentLocationId } }),
      ).resolves.toMatchObject({ name: "Sanctuary", version: 1 });
      await expect(
        tx.catTagOnCat.count({ where: { catId: cat.id } }),
      ).resolves.toBe(2);
      await expect(
        tx.catTag.findFirstOrThrow({ where: { name: "CCLAF" } }),
      ).resolves.toMatchObject({ deletedAt: null, version: 2 });
      await expect(
        tx.vaccination.findMany({
          where: { catId: cat.id },
          orderBy: { vaccineName: "asc" },
        }),
      ).resolves.toHaveLength(2);
      await expect(
        tx.auditEvent.findFirstOrThrow({
          where: { catId: cat.id, eventType: "cat_created" },
        }),
      ).resolves.toMatchObject({
        oldValue: null,
        newValue: null,
        actorUserId: actorId,
      });
      await expect(
        tx.auditEvent.findMany({ where: { catId: cat.id } }),
      ).resolves.toMatchObject([
        { eventType: "cat_created", oldValue: null, newValue: null },
      ]);
    });
  });

  it("rejects a Trello card already linked to a cat", async () => {
    await runInTestTransaction(async (tx) => {
      const actorId = await createActor(tx);
      const card = sampleCard();
      await tx.cat.create({
        data: {
          name: "Existing",
          trelloUrl: "https://trello.com/c/card123/a-different-slug",
          currentLocation: { create: { name: "Existing location" } },
        },
      });
      await expect(
        handler(tx as PrismaService, card).handle(
          "https://trello.com/c/card123",
          actorId,
          false,
        ),
      ).rejects.toMatchObject({
        constructor: ConflictException,
        response: {
          duplicateCat: {
            id: expect.any(String),
            name: "Existing",
          },
        },
      });
    });
  });

  it("chooses the next cat number and reuses a normalized active location", async () => {
    await runInTestTransaction(async (tx) => {
      const actorId = await createActor(tx);
      const location = await tx.location.create({
        data: { name: "Sanctuary", status: "ACTIVE" },
        select: { id: true },
      });
      await tx.cat.create({
        data: {
          name: "Momo",
          currentLocationId: location.id,
        },
      });
      const card = sampleCard({
        name: "Momo",
        desc: "Location:   sanctuary   ",
        labels: undefined,
      });
      const result = await handler(tx as PrismaService, card).handle(
        "https://trello.com/c/card123",
        actorId,
        false,
      );
      await expect(
        tx.cat.findUniqueOrThrow({ where: { id: result.id } }),
      ).resolves.toMatchObject({
        name: "Momo",
        nameNumber: 2,
        currentLocationId: location.id,
      });
      await expect(
        tx.location.count({ where: { name: "Sanctuary", isTest: false } }),
      ).resolves.toBe(1);
    });
  });

  it("rejects a microchip number already assigned to another cat", async () => {
    await runInTestTransaction(async (tx) => {
      const actorId = await createActor(tx);
      await tx.cat.create({
        data: {
          name: "Existing",
          microchipNumber: "956000018355049",
          currentLocation: { create: { name: "Existing location" } },
        },
      });
      const card = sampleCard({
        checklists: [
          {
            name: "Documents",
            checkItems: [{ name: "Chip 956000018355049", state: "complete" }],
          },
        ],
      });
      await expect(
        handler(tx as PrismaService, card).handle(
          "https://trello.com/c/card123",
          actorId,
          false,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  it("downloads and imports Trello PDF attachments", async () => {
    let bucketName: string | undefined;
    try {
      await runInTestTransaction(async (tx) => {
        bucketName = await createBucket("trello-import", s3Client);
        const actorId = await createActor(tx);
        const card = sampleCard({
          attachments: [
            {
              name: "passport.pdf",
              url: "https://trello.com/1/cards/card123/attachments/file123/download/passport.pdf",
              mimeType: "application/pdf",
              isUpload: true,
            },
          ],
        });
        const client = new TestTrelloClient(card, {
          bytes: Buffer.from("%PDF-1.4 test"),
          contentType: "application/pdf",
        });
        const urls = new CatPhotoUrlService(
          new ConfigService({ s3: { bucketName } }),
          s3Client,
        );
        const result = await new ImportTrelloHandler(
          tx as PrismaService,
          client,
          urls,
        ).handle("https://trello.com/c/card123", actorId, false);

        await expect(
          tx.catDocument.findMany({ where: { catId: result.id } }),
        ).resolves.toMatchObject([
          { fileName: "passport.pdf", createdByUserId: actorId },
        ]);
        await expect(
          tx.auditEvent.findMany({ where: { catId: result.id } }),
        ).resolves.toHaveLength(1);
      });
    } finally {
      if (bucketName) await deleteBucket(bucketName, s3Client);
    }
  });

  it("uploads Trello image attachments as cat photos", async () => {
    let bucketName: string | undefined;
    try {
      bucketName = await createBucket("trello-image-import", s3Client);
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
        const card = sampleCard({
          attachments: [
            {
              name: "cat-photo.jpg",
              url: "https://trello.com/1/cards/card123/attachments/file123/download/cat-photo.jpg",
              mimeType: "image/jpeg",
              isUpload: true,
            },
          ],
        });
        const client = new TestTrelloClient(card, {
          bytes: jpeg,
          contentType: "image/jpeg",
        });
        const urls = new CatPhotoUrlService(
          new ConfigService({ s3: { bucketName } }),
          s3Client,
        );
        const result = await new ImportTrelloHandler(
          tx as PrismaService,
          client,
          urls,
        ).handle("https://trello.com/c/card123", actorId, false);

        await expect(
          tx.catPhoto.findMany({ where: { catId: result.id } }),
        ).resolves.toMatchObject([
          { fileName: "cat-photo.jpg", createdByUserId: actorId },
        ]);
        await expect(
          tx.cat.findUniqueOrThrow({ where: { id: result.id } }),
        ).resolves.toMatchObject({ primaryPhotoKey: expect.any(String) });
        await expect(
          tx.auditEvent.findMany({ where: { catId: result.id } }),
        ).resolves.toHaveLength(1);
      });
    } finally {
      if (bucketName) await deleteBucket(bucketName, s3Client);
    }
  });

  it("prepares attachments before writes with at most five downloads in flight", async () => {
    let activeDownloads = 0;
    let peakDownloads = 0;
    let bucketName: string | undefined;
    try {
      bucketName = await createBucket("trello-concurrency", s3Client);
      await runInTestTransaction(async (tx) => {
        const actorId = await createActor(tx);
        const initialCatCount = await tx.cat.count();
        const initialDocumentCount = await tx.catDocument.count();
        const card = sampleCard({
          attachments: Array.from({ length: 8 }, (_, index) => ({
            name: `passport-${index}.pdf`,
            url: `https://trello.com/1/cards/card123/attachments/file${index}/download/passport-${index}.pdf`,
            mimeType: "application/pdf",
            isUpload: true,
          })),
        });
        const client = new TestTrelloClient(
          card,
          {
            bytes: Buffer.from("%PDF-1.4 test"),
            contentType: "application/pdf",
          },
          async () => {
            activeDownloads++;
            peakDownloads = Math.max(peakDownloads, activeDownloads);
            try {
              expect(await tx.cat.count()).toBe(initialCatCount);
              await new Promise((resolve) => setTimeout(resolve, 5));
              return {
                bytes: Buffer.from("%PDF-1.4 test"),
                contentType: "application/pdf",
              };
            } finally {
              activeDownloads--;
            }
          },
        );
        const urls = new CatPhotoUrlService(
          new ConfigService({ s3: { bucketName } }),
          s3Client,
        );
        await new ImportTrelloHandler(tx as PrismaService, client, urls).handle(
          "https://trello.com/c/card123",
          actorId,
          false,
        );
        expect(peakDownloads).toBe(5);
        await expect(tx.catDocument.count()).resolves.toBe(
          initialDocumentCount + 8,
        );
      });
    } finally {
      if (bucketName) await deleteBucket(bucketName, s3Client);
    }
  });
});

class TestTrelloClient extends TrelloClient {
  constructor(
    private readonly card: TrelloCard,
    private readonly attachmentDownload = {
      bytes: Buffer.alloc(0),
      contentType: "application/octet-stream",
    },
    private readonly onDownload?: () => Promise<{
      bytes: Buffer;
      contentType: string;
    }>,
  ) {
    super(new ConfigService());
  }

  override async getCard(): Promise<TrelloCard> {
    return this.card;
  }

  override async downloadAttachment(): Promise<{
    bytes: Buffer;
    contentType: string;
  }> {
    if (this.onDownload) return this.onDownload();
    return this.attachmentDownload;
  }
}

function handler(prisma: PrismaService, card: TrelloCard): ImportTrelloHandler {
  return new ImportTrelloHandler(prisma, new TestTrelloClient(card), photoUrls);
}

async function createActor(tx: Prisma.TransactionClient): Promise<string> {
  const user = await tx.user.create({
    data: {
      fullName: "Trello import test",
      email: `${crypto.randomUUID()}@example.test`,
    },
    select: { id: true },
  });
  return user.id;
}

function sampleCard(overrides: Partial<TrelloCard> = {}): TrelloCard {
  return {
    id: "card123",
    name: "Momo",
    url: "https://trello.com/c/card123/momo",
    shortUrl: "https://trello.com/c/card123",
    desc: "",
    idLabels: [],
    labels: [],
    checklists: [],
    attachments: [],
    ...overrides,
  };
}
