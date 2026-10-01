import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { createFlightFixture } from "../flight-test-fixtures";
import { ListFlightsHandler } from "./list-flights.handler";

describe("ListFlightsHandler", () => {
  it("returns active flights with active assignment counts in the user's partition", async () => {
    await runInTestTransaction(async (transaction) => {
      const active = await createFlightFixture(transaction);
      const deleted = await createFlightFixture(transaction, {
        deletedAt: new Date(),
      });
      const testFlight = await createFlightFixture(transaction, {
        isTest: true,
      });
      const handler = new ListFlightsHandler(transaction as PrismaService);

      const flights = await handler.handle(false, false);

      expect(flights).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: active.id,
            date: "2026-10-15",
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
      const handler = new ListFlightsHandler(transaction as PrismaService);

      const flights = await handler.handle(false, true);

      expect(flights).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: deleted.id,
            deletedAt: deleted.deletedAt?.toISOString(),
          }),
        ]),
      );
      expect(flights.every((flight) => flight.deletedAt !== null)).toBe(true);
    });
  });
});
