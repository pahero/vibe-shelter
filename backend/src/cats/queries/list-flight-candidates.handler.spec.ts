import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { ConfigService } from "@nestjs/config";
import { S3Client } from "@aws-sdk/client-s3";
import { CatPhotoUrlService } from "../cat-photo-url.service";
import { ListFlightCandidatesHandler } from "./list-flight-candidates.handler";

function createPhotoUrls(): CatPhotoUrlService {
  return new CatPhotoUrlService(new ConfigService({ s3: { bucketName: "" } }), new S3Client({ region: "us-east-1" }));
}

describe("ListFlightCandidatesHandler", () => {
  it("returns vaccine, passport, chip, and adopter readiness for the user partition", async () => {
    await runInTestTransaction(async (transaction) => {
      const location = await transaction.location.create({
        data: { name: `Flight ${Date.now()}` },
      });
      const readyCat = await transaction.cat.create({
        data: {
          name: `Ready ${Date.now()}`,
          isFlightCandidate: true,
          currentLocationId: location.id,
          microchipNumber: `chip-${Date.now()}-${Math.random()}`,
          passport: true,
          adopterName: "Taylor Adopter",
          adopterAddress: "123 Cat Street",
          felvFivTestDone: true,
          vaccinations: {
            create: [
              {
                date: new Date("2026-01-01"),
                type: "CORE",
              },
              {
                date: new Date("2026-02-01"),
                type: "CORE",
              },
              { date: new Date("2026-03-01"), type: "RABIES" },
              {
                date: new Date("2026-04-01"),
                type: "RABIES",
                deletedAt: new Date(),
              },
            ],
          },
        },
      });
      const testCat = await transaction.cat.create({
        data: { name: `Other partition ${Date.now()}`, isTest: true },
      });
      const activeFlight = await transaction.flight.create({
        data: { date: new Date("2026-10-01"), airport: "Larnaca", flightNumber: `CY${Date.now()}`, flightParent: "Parent" },
      });
      const removedFlight = await transaction.flight.create({
        data: { date: new Date("2026-10-02"), airport: "Larnaca", flightNumber: `CY${Date.now()}R`, flightParent: "Parent", deletedAt: new Date() },
      });
      const deletedAssignmentFlight = await transaction.flight.create({
        data: { date: new Date("2026-10-03"), airport: "Larnaca", flightNumber: `CY${Date.now()}D`, flightParent: "Parent" },
      });
      await transaction.flightCatAssignment.createMany({
        data: [
          { flightId: activeFlight.id, catId: readyCat.id },
          { flightId: removedFlight.id, catId: readyCat.id },
        ],
      });
      await transaction.flightCatAssignment.create({
        data: { flightId: deletedAssignmentFlight.id, catId: readyCat.id, deletedAt: new Date() },
      });

      const handler = new ListFlightCandidatesHandler(
        transaction as PrismaService,
        createPhotoUrls(),
      );
      const candidates = await handler.handle(false);

      expect(candidates).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: readyCat.id,
            primaryPhotoUrl: null,
            currentLocationName: location.name,
            flights: [
              { id: activeFlight.id, flightNumber: activeFlight.flightNumber },
            ],
            requirements: {
              firstVaccine: true,
              secondVaccine: true,
              rabies: true,
              passport: true,
              chipped: true,
              adopter: true,
              felvFivTestDone: true,
            },
          }),
        ]),
      );
      expect(candidates.map(({ id }) => id)).not.toContain(testCat.id);
    });
  });

  it("returns incomplete active cats but excludes archived cats in the test partition", async () => {
    await runInTestTransaction(async (transaction) => {
      const cat = await transaction.cat.create({
        data: {
          name: `Needs details ${Date.now()}`,
          adopterName: "Name only",
          archivedAt: new Date("2026-05-01"),
          isTest: true,
        },
      });
      const regularCat = await transaction.cat.create({
        data: { name: `Regular partition ${Date.now()}` },
      });
      const activeCat = await transaction.cat.create({
        data: { name: `Active test cat ${Date.now()}`, isTest: true, isFlightCandidate: true },
      });

      const handler = new ListFlightCandidatesHandler(
        transaction as PrismaService,
        createPhotoUrls(),
      );
      const candidates = await handler.handle(true);

      expect(candidates.map(({ id }) => id)).not.toContain(cat.id);
      expect(candidates).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: activeCat.id,
            archivedAt: null,
            requirements: {
              firstVaccine: false,
              secondVaccine: false,
              rabies: false,
              passport: false,
              chipped: false,
              adopter: false,
              felvFivTestDone: false,
            },
          }),
        ]),
      );
      expect(candidates.map(({ id }) => id)).not.toContain(regularCat.id);
    });
  });
});
