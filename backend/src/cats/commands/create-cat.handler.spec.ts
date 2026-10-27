import { ConflictException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client } from "@aws-sdk/client-s3";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction, getS3Client } from "../../test-utils/test-db";
import { CatPhotoUrlService } from "../cat-photo-url.service";
import { CreateCatCommand } from "./create-cat.command";
import { CreateCatHandler } from "./create-cat.handler";
import { WriteCatAuditEventCommand } from "./write-cat-audit-event.command";

let photoUrls: CatPhotoUrlService;

describe("CreateCatHandler", () => {
  let s3Client: S3Client;

  beforeAll(() => {
    s3Client = getS3Client();
    photoUrls = new CatPhotoUrlService(new ConfigService(), s3Client);
  });

  afterAll(() => s3Client.destroy());

  it("creates a cat card and emits a value-free creation event", async () => {
    await runInTestTransaction(async (tx) => {
      const prisma = tx as PrismaService;
      const actorUserId = await createActor(tx);
      const card = await createHandler(prisma).execute(
        createCommand(actorUserId, { name: unique("Mila") }),
      );

      expect(card.name).toContain("Mila");
      expect(card.nameNumber).toBe(1);
      expect(card.primaryPhotoUrl).toBeNull();
      await expect(
        tx.auditEvent.findFirstOrThrow({ where: { catId: card.id } }),
      ).resolves.toMatchObject({
        eventType: "cat_created",
        actorUserId,
        oldValue: null,
        newValue: null,
      });
    });
  });

  it("assigns subsequent name numbers separately in each partition", async () => {
    await runInTestTransaction(async (tx) => {
      const handler = createHandler(tx as PrismaService);
      const actorUserId = await createActor(tx);
      const name = unique("Tom");
      const first = await handler.execute(createCommand(actorUserId, { name }));
      const second = await handler.execute(
        createCommand(actorUserId, { name }),
      );
      const testCat = await handler.execute(
        createCommand(actorUserId, { name, isTest: true }),
      );

      expect([first.nameNumber, second.nameNumber, testCat.nameNumber]).toEqual(
        [1, 2, 1],
      );
    });
  });

  it("persists command fields and returns the active location", async () => {
    await runInTestTransaction(async (tx) => {
      const prisma = tx as PrismaService;
      const actorUserId = await createActor(tx);
      const location = await tx.location.create({
        data: { name: unique("active-location"), status: "ACTIVE" },
      });
      const estimatedBirthDate = new Date("2024-03-15");
      const intakeDate = new Date("2026-04-01");
      const microchipNumber = unique("chip");
      const card = await createHandler(prisma).execute(
        new CreateCatCommand(
          unique("Mila"),
          "FEMALE",
          "Calico",
          estimatedBirthDate,
          intakeDate,
          "Found near clinic",
          "RESCUE_ORGANISATION",
          microchipNumber,
          true,
          "Taylor Sponsor",
          "STERILIZED",
          location.id,
          actorUserId,
          false,
        ),
      );

      expect(card).toMatchObject({
        sex: "FEMALE",
        color: "Calico",
        estimatedBirthDate: estimatedBirthDate.toISOString(),
        intakeDate: intakeDate.toISOString(),
        sterilizationStatus: "STERILIZED",
        currentLocationId: location.id,
        currentLocationName: location.name,
        microchipNumber,
        passport: true,
        sponsorName: "Taylor Sponsor",
        adopterName: null,
        adopterAddress: null,
        felvFivTestDone: false,
        tags: [],
      });
      await expect(
        tx.cat.findUniqueOrThrow({ where: { id: card.id } }),
      ).resolves.toMatchObject({
        intakeDetails: "Found near clinic",
        intakeSource: "RESCUE_ORGANISATION",
        createdByUserId: actorUserId,
        isTest: false,
      });
      await expect(
        tx.location.findUniqueOrThrow({ where: { id: location.id } }),
      ).resolves.toMatchObject({ version: 1 });
    });
  });

  it.each(["INACTIVE", "ARCHIVED"] as const)(
    "rejects a %s location",
    async (status) => {
      await runInTestTransaction(async (tx) => {
        const actorUserId = await createActor(tx);
        const location = await tx.location.create({
          data: { name: unique(`${status}-location`), status },
        });
        await expect(
          createHandler(tx as PrismaService).execute(
            createCommand(actorUserId, {
              name: unique(`${status}-cat`),
              currentLocationId: location.id,
            }),
          ),
        ).rejects.toThrow(new NotFoundException("Active location not found"));
      });
    },
  );

  it("rejects a location from the other test partition and missing locations", async () => {
    await runInTestTransaction(async (tx) => {
      const actorUserId = await createActor(tx);
      const handler = createHandler(tx as PrismaService);
      const testLocation = await tx.location.create({
        data: { name: unique("test-location"), isTest: true },
      });
      await expect(
        handler.execute(
          createCommand(actorUserId, {
            name: unique("cross-partition"),
            currentLocationId: testLocation.id,
          }),
        ),
      ).rejects.toThrow(new NotFoundException("Active location not found"));
      await expect(
        handler.execute(
          createCommand(actorUserId, {
            name: unique("missing-location"),
            currentLocationId: "missing-location",
          }),
        ),
      ).rejects.toThrow(new NotFoundException("Active location not found"));
    });
  });

  it("rejects a duplicate microchip number", async () => {
      await runInTestTransaction(async (tx) => {
        const actorUserId = await createActor(tx);
        const handler = createHandler(tx as PrismaService);
        const value = unique("microchip");
        await handler.execute(
          createCommand(actorUserId, {
            name: unique("first"),
            microchipNumber: value,
          }),
        );
        await expect(
          handler.execute(
            createCommand(actorUserId, {
              name: unique("second"),
              microchipNumber: value,
            }),
          ),
        ).rejects.toThrow(ConflictException);
      });
    });
});

function createHandler(prisma: PrismaService): CreateCatHandler {
  return new CreateCatHandler(
    prisma,
    photoUrls,
    new WriteCatAuditEventCommand(),
  );
}

async function createActor(tx: Prisma.TransactionClient): Promise<string> {
  const actor = await tx.user.create({
    data: { email: `${unique("creator")}@example.com` },
  });
  return actor.id;
}

function createCommand(
  actorUserId: string,
  overrides: Partial<{
    name: string;
    microchipNumber: string;
    passport: boolean;
    sponsorName: string;
    currentLocationId: string;
    isTest: boolean;
  }> = {},
): CreateCatCommand {
  return new CreateCatCommand(
    overrides.name ?? unique("Mila"),
    "UNKNOWN",
    null,
    null,
      null,
      null,
      null,
      overrides.microchipNumber ?? null,
    overrides.passport ?? false,
    overrides.sponsorName ?? null,
    "UNKNOWN",
    overrides.currentLocationId ?? null,
    actorUserId,
    overrides.isTest ?? false,
  );
}

function unique(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
