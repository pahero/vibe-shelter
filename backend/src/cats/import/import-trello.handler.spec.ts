import { ConflictException } from "@nestjs/common";
import { vi } from "vitest";
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
              { name: "Adoption contract", state: "complete" },
            ],
          },
          {
            name: "adopter informations",
            checkItems: [
              { name: "Name of adopter Jane Doe", state: "complete" },
              { name: "Address of adopter 5 Main Street", state: "complete" },
              { name: "Preparation fee paid", state: "complete" },
              { name: "Flight fee paid", state: "incomplete" },
            ],
          },
          {
            name: "flight informations",
            checkItems: [
              { name: "Flight date 12/10/2026", state: "complete" },
              { name: "Flight number LH123", state: "incomplete" },
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
        adopterName: "Jane Doe",
        adopterAddress: "5 Main Street",
        adopterDetails:
          "Name of adopter Jane Doe\nAddress of adopter 5 Main Street\nPreparation fee paid",
        flightDetails: "Flight date 12/10/2026",
        preparationFeePaid: true,
        flightFeePaid: false,
        adoptionContract: true,
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

  it("trims leading and trailing whitespace from the imported Comment field", async () => {
    await runInTestTransaction(async (tx) => {
      const actorId = await createActor(tx);
      const result = await handler(
        tx as PrismaService,
        sampleCard({ desc: "\n\n  Comment text\n\n" }),
      ).handle("https://trello.com/c/card123", actorId, false);

      await expect(
        tx.cat.findUniqueOrThrow({ where: { id: result.id } }),
      ).resolves.toMatchObject({ intakeDetails: "Comment text" });
    });
  });

  it("creates and assigns the optional import tag to the cat", async () => {
    await runInTestTransaction(async (tx) => {
      const actorId = await createActor(tx);
      const result = await handler(tx as PrismaService, sampleCard()).handle(
        "https://trello.com/c/card123",
        actorId,
        false,
        false,
        "Imported batch",
      );
      const tag = await tx.catTag.findFirstOrThrow({
        where: { name: "Imported batch", isTest: false },
      });

      await expect(
        tx.catTagOnCat.findFirstOrThrow({
          where: { catId: result.id, tagId: tag.id },
        }),
      ).resolves.toMatchObject({ catId: result.id, tagId: tag.id });
      await expect(
        tx.auditEvent.findFirstOrThrow({
          where: { tagId: tag.id, eventType: "tag_action" },
        }),
      ).resolves.toMatchObject({
        action: "create",
        actorUserId: actorId,
      });
    });
  });

  it("creates and assigns an optional tag supplied for import", async () => {
    await runInTestTransaction(async (tx) => {
      const actorId = await createActor(tx);
      const result = await handler(tx as PrismaService, sampleCard()).handle(
        "https://trello.com/c/card123",
        actorId,
        false,
        false,
        "Imported batch",
      );
      const tag = await tx.catTag.findFirstOrThrow({
        where: { name: "Imported batch", isTest: false },
      });

      await expect(
        tx.catTagOnCat.findFirstOrThrow({
          where: { catId: result.id, tagId: tag.id },
        }),
      ).resolves.toMatchObject({ catId: result.id, tagId: tag.id });
      await expect(
        tx.auditEvent.findFirstOrThrow({
          where: { tagId: tag.id, eventType: "tag_action" },
        }),
      ).resolves.toMatchObject({
        action: "create",
        actorUserId: actorId,
      });
    });
  });

  it("imports adopter country and archive data from the column, not the card name", async () => {
    await runInTestTransaction(async (tx) => {
      const actorId = await createActor(tx);
      const reason = await tx.catArchivingReason.create({
        data: { name: "Adopted in Germany" },
      });
      const card = sampleCard({
        name: "Lucia #1",
        desc: "Location: old location",
        columnName: "DE-completed 2020",
        checklists: [
          {
            name: "Vaccinations",
            checkItems: [
              { name: "1st vaccination", state: "complete" },
              { name: "2nd vaccination", state: "complete" },
              { name: "Rabies", state: "complete" },
            ],
          },
        ],
      });
      const result = await handler(tx as PrismaService, card).handle(
        "https://trello.com/c/card123",
        actorId,
        false,
        true,
      );

      await expect(
        tx.cat.findUniqueOrThrow({ where: { id: result.id } }),
      ).resolves.toMatchObject({
        name: "Lucia",
        nameNumber: 1,
        adopterCountry: "EU",
        archivedAt: new Date("2020-01-01T00:00:00.000Z"),
        archivingReasonId: reason.id,
      });
      const cat = await tx.cat.findUniqueOrThrow({
        where: { id: result.id },
        select: { currentLocation: { select: { name: true } } },
      });
      expect(cat.currentLocation.name).toBe("Shelter");
      await expect(
        tx.vaccination.findMany({
          where: { catId: result.id },
          orderBy: { vaccineName: "asc" },
          select: { vaccineName: true, date: true },
        }),
      ).resolves.toEqual([
        {
          vaccineName: "First vaccination",
          date: new Date("2020-09-01T00:00:00.000Z"),
        },
        { vaccineName: "Rabies", date: new Date("2020-09-22T00:00:00.000Z") },
        {
          vaccineName: "Second vaccination",
          date: new Date("2020-09-22T00:00:00.000Z"),
        },
      ]);
    });
  });

  it("parses hyphenated country names such as EU-completed 2026", async () => {
    await runInTestTransaction(async (tx) => {
      const actorId = await createActor(tx);
      const reason = await tx.catArchivingReason.create({
        data: { name: "Adopted in the EU" },
      });
      const result = await handler(
        tx as PrismaService,
        sampleCard({
          name: "Lucia #1",
          columnName: "EU-completed 2026",
        }),
      ).handle("https://trello.com/c/card123", actorId, false, true);

      await expect(
        tx.cat.findUniqueOrThrow({ where: { id: result.id } }),
      ).resolves.toMatchObject({
        name: "Lucia",
        nameNumber: 1,
        adopterCountry: "EU",
        archivedAt: new Date("2026-01-01T00:00:00.000Z"),
        archivingReasonId: reason.id,
      });
    });
  });

  it("normalizes copied non-breaking spaces in the column name", async () => {
    await runInTestTransaction(async (tx) => {
      const actorId = await createActor(tx);
      const reason = await tx.catArchivingReason.create({
        data: { name: "Adopted in the EU" },
      });
      const result = await handler(
        tx as PrismaService,
        sampleCard({
          name: "Lucia #1",
          columnName: "EU\u00a0-completed\u00a02026",
        }),
      ).handle("https://trello.com/c/card123", actorId, false, true);

      await expect(
        tx.cat.findUniqueOrThrow({ where: { id: result.id } }),
      ).resolves.toMatchObject({
        name: "Lucia",
        nameNumber: 1,
        adopterCountry: "EU",
        archivingReasonId: reason.id,
      });
    });
  });

  it("creates a missing adopter archiving reason with a creation audit event", async () => {
    await runInTestTransaction(async (tx) => {
      const actorId = await createActor(tx);
      const result = await handler(
        tx as PrismaService,
        sampleCard({ name: "Lucia #1", columnName: "CY-completed 2020" }),
      ).handle("https://trello.com/c/card123", actorId, false, true);
      const reason = await tx.catArchivingReason.findFirstOrThrow({
        where: { name: "Adopted in CY", isTest: false },
      });

      await expect(
        tx.cat.findUniqueOrThrow({ where: { id: result.id } }),
      ).resolves.toMatchObject({
        archivingReasonId: reason.id,
        adopterCountry: "CY",
      });
      await expect(
        tx.auditEvent.findFirstOrThrow({
          where: {
            archivingReasonId: reason.id,
            eventType: "archiving_reason_create",
          },
        }),
      ).resolves.toMatchObject({
        actorUserId: actorId,
        oldValue: null,
        newValue: null,
      });
    });
  });

  it.each([
    ["unstructured column", "no code or year"],
    ["unsupported country", "US-completed 2020"],
  ])("rejects adopter transfer with %s", async (_caseName, columnName) => {
    await runInTestTransaction(async (tx) => {
      const actorId = await createActor(tx);
      await expect(
        handler(
          tx as PrismaService,
          sampleCard({ name: "Lucia #1", columnName }),
        ).handle("https://trello.com/c/card123", actorId, false, true),
      ).rejects.toThrow(ConflictException);
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
      const trello = new TestTrelloClient(card);
      const getCard = vi.spyOn(trello, "getCard");
      await expect(
        new ImportTrelloHandler(tx as PrismaService, trello, photoUrls).handle(
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
      expect(getCard).not.toHaveBeenCalled();
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
              id: "cover-attachment",
              name: "cat-photo.jpg",
              url: "https://trello.com/1/cards/card123/attachments/file123/download/cat-photo.jpg",
              mimeType: "image/jpeg",
              isUpload: true,
            },
            {
              id: "other-attachment",
              name: "other-photo.jpg",
              url: "https://trello.com/1/cards/card123/attachments/file124/download/other-photo.jpg",
              mimeType: "image/jpeg",
              isUpload: true,
            },
          ],
          cover: { idAttachment: "other-attachment" },
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

        const photos = await tx.catPhoto.findMany({
          where: { catId: result.id },
          orderBy: { fileName: "asc" },
        });
        expect(photos).toMatchObject([
          { fileName: "cat-photo.jpg", createdByUserId: actorId },
          { fileName: "other-photo.jpg", createdByUserId: actorId },
        ]);
        await expect(
          tx.cat.findUniqueOrThrow({ where: { id: result.id } }),
        ).resolves.toMatchObject({ primaryPhotoKey: photos[1].key });
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
