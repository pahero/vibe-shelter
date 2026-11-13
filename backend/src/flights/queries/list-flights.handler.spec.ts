import { PrismaService } from "../../database/prisma.service";
import { ConfigService } from "@nestjs/config";
import { S3Client } from "@aws-sdk/client-s3";
import { CatPhotoUrlService } from "../../cats/cat-photo-url.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import {
  createFlightAssignment,
  createFlightFixture,
  createFlightTestCat,
} from "../flight-test-fixtures";
import { ListFlightsHandler } from "./list-flights.handler";

describe("ListFlightsHandler", () => {
  const s3 = new S3Client({ region: "us-east-1" });
  const photoUrls = new CatPhotoUrlService(
    new ConfigService({ s3: { bucketName: "" } }),
    s3,
  );
  afterAll(() => s3.destroy());

  it("returns active flights with active assignment counts in the user's partition", async () => {
    await runInTestTransaction(async (transaction) => {
      const active = await createFlightFixture(transaction);
      const deleted = await createFlightFixture(transaction, {
        deletedAt: new Date(),
      });
      const testFlight = await createFlightFixture(transaction, {
        isTest: true,
      });
      const handler = new ListFlightsHandler(
        transaction as PrismaService,
        photoUrls,
      );

      const flights = await handler.handle(false, false);

      expect(flights).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: active.id,
            date: "2026-10-15",
            comment: null,
            catCount: 0,
            deletedAt: null,
          }),
        ]),
      );
      expect(flights.map(({ id }) => id)).not.toContain(deleted.id);
      expect(flights.map(({ id }) => id)).not.toContain(testFlight.id);
    });
  });

  it("returns deleted flights when requested", async () => {
    await runInTestTransaction(async (transaction) => {
      const deleted = await createFlightFixture(transaction, {
        deletedAt: new Date("2026-10-20T00:00:00.000Z"),
      });
      const cat = await createFlightTestCat(transaction);
      await createFlightAssignment(transaction, deleted.id, cat.id, {
        f2fDone: true,
      });
      const archived = await createFlightFixture(transaction, {
        archivedAt: new Date("2026-10-21T00:00:00.000Z"),
      });
      const handler = new ListFlightsHandler(
        transaction as PrismaService,
        photoUrls,
      );

      const flights = await handler.handle(false, true);

      expect(flights).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: deleted.id,
            deletedAt: deleted.deletedAt?.toISOString(),
            assignedCats: [
              {
                id: cat.id,
                name: cat.name,
                nameNumber: cat.nameNumber,
                primaryPhotoUrl: null,
              },
            ],
          }),
          expect.objectContaining({
            id: archived.id,
            archivedAt: archived.archivedAt?.toISOString(),
          }),
        ]),
      );
    });
  });
});
