import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { createFlightAssignment, createFlightFixture, createFlightTestCat } from "../flight-test-fixtures";
import { GetFlightHandler } from "./get-flight.handler";

describe("GetFlightHandler", () => {
  it("returns active cats and their F2F/traces status, excluding removed assignments", async () => {
    await runInTestTransaction(async (transaction) => {
      const flight = await createFlightFixture(transaction);
      const cat = await createFlightTestCat(transaction);
      const otherCat = await createFlightTestCat(transaction);
      const active = await createFlightAssignment(transaction, flight.id, cat.id, { f2fDone: true, tracesDone: false });
      await createFlightAssignment(transaction, flight.id, otherCat.id, { deletedAt: new Date() });
      const handler = new GetFlightHandler(transaction as PrismaService);

      const result = await handler.handle(flight.id, false);

      expect(result).toMatchObject({ id: flight.id, airport: flight.airport, cats: [{ assignmentId: active.id, cat: { id: cat.id }, f2fDone: true, tracesDone: false }] });
      expect(result.cats).toHaveLength(1);
    });
  });

  it("rejects a missing flight", async () => {
    await runInTestTransaction(async (transaction) => {
      const handler = new GetFlightHandler(transaction as PrismaService);

      await expect(handler.handle("missing-flight", false)).rejects.toThrow(NotFoundException);
    });
  });

  it("rejects a deleted flight", async () => {
    await runInTestTransaction(async (transaction) => {
      const deleted = await createFlightFixture(transaction, { deletedAt: new Date() });
      const handler = new GetFlightHandler(transaction as PrismaService);

      await expect(handler.handle(deleted.id, false)).rejects.toThrow(NotFoundException);
    });
  });

  it("rejects an other-partition flight", async () => {
    await runInTestTransaction(async (transaction) => {
      const testFlight = await createFlightFixture(transaction, { isTest: true });
      const handler = new GetFlightHandler(transaction as PrismaService);

      await expect(handler.handle(testFlight.id, false)).rejects.toThrow(NotFoundException);
    });
  });
});
