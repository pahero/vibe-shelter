import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { createFlightTestActor, createFlightFixture } from "../flight-test-fixtures";
import { RestoreFlightHandler } from "./restore-flight.handler";

describe("RestoreFlightHandler", () => {
  it("restores a flight, updates its token, and writes a value-free audit event", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const flight = await createFlightFixture(transaction, { deletedAt: new Date() });
      const handler = new RestoreFlightHandler(transaction as PrismaService);

      await expect(handler.handle(flight.id, actor.id, false)).resolves.toEqual({ id: flight.id });

      const saved = await transaction.flight.findUniqueOrThrow({ where: { id: flight.id } });
      expect(saved.deletedAt).toBeNull();
      expect(saved.concurrencyToken).not.toBe(flight.concurrencyToken);
      expect(await transaction.flightAuditEvent.findFirstOrThrow({ where: { flightId: flight.id } })).toMatchObject({ eventType: "flight_restored", oldValue: null, newValue: null });
    });
  });

  it("rejects an active flight", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const active = await createFlightFixture(transaction);
      const handler = new RestoreFlightHandler(transaction as PrismaService);

      await expect(handler.handle(active.id, actor.id, false)).rejects.toThrow(NotFoundException);
    });
  });

  it("rejects an other-partition deleted flight", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const testDeleted = await createFlightFixture(transaction, { isTest: true, deletedAt: new Date() });
      const handler = new RestoreFlightHandler(transaction as PrismaService);

      await expect(handler.handle(testDeleted.id, actor.id, false)).rejects.toThrow(NotFoundException);
    });
  });
});
