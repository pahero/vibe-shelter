import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { ListFlightCandidatesHandler } from "./list-flight-candidates.handler";

describe("ListFlightCandidatesHandler", () => {
  it("returns vaccine, passport, chip, and adopter readiness for the user partition", async () => {
    await runInTestTransaction(async (transaction) => {
      const location = await transaction.location.create({
        data: { name: `Flight ${Date.now()}` },
      });
      const readyCat = await transaction.cat.create({
        data: {
          name: `Ready ${Date.now()}`,
          currentLocationId: location.id,
          microchipNumber: `chip-${Date.now()}-${Math.random()}`,
          passportNumber: `passport-${Date.now()}-${Math.random()}`,
          adopterName: "Taylor Adopter",
          adopterAddress: "123 Cat Street",
          felvFivTestDone: true,
          preventiveTreatments: {
            create: [
              {
                date: new Date("2026-01-01"),
                name: "Vaccine 1",
                type: "FIRST_VACCINE",
              },
              {
                date: new Date("2026-02-01"),
                name: "Vaccine 2",
                type: "SECOND_VACCINE",
              },
              { date: new Date("2026-03-01"), name: "Rabies", type: "RABIES" },
              {
                date: new Date("2026-04-01"),
                name: "Deleted rabies",
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

      const handler = new ListFlightCandidatesHandler(
        transaction as PrismaService,
      );
      const candidates = await handler.handle(false);

      expect(candidates).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: readyCat.id,
            currentLocationName: location.name,
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
        data: { name: `Active test cat ${Date.now()}`, isTest: true },
      });

      const handler = new ListFlightCandidatesHandler(
        transaction as PrismaService,
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
