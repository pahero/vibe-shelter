import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import {
  createFlightTestActor,
  createFlightFixture,
} from "../flight-test-fixtures";
import { DeleteFlightHandler } from "./delete-flight.handler";

describe("DeleteFlightHandler", () => {
  it("soft-deletes the flight, updates its token, and writes a value-free audit event", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const flight = await createFlightFixture(transaction);
      const handler = new DeleteFlightHandler(transaction as PrismaService);

      await handler.handle(flight.id, actor.id, false);

      const saved = await transaction.flight.findUniqueOrThrow({
        where: { id: flight.id },
      });
      expect(saved.deletedAt).toBeInstanceOf(Date);
      expect(saved.concurrencyToken).not.toBe(flight.concurrencyToken);
      expect(
        await transaction.auditEvent.findFirstOrThrow({
          where: { flightId: flight.id },
        }),
      ).toMatchObject({
        eventType: "flight_deleted",
        oldValue: null,
        newValue: null,
      });
    });
  });

  it("rejects an already deleted flight", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const deleted = await createFlightFixture(transaction, {
        deletedAt: new Date(),
      });
      const handler = new DeleteFlightHandler(transaction as PrismaService);

      await expect(handler.handle(deleted.id, actor.id, false)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  it("rejects a missing flight", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const handler = new DeleteFlightHandler(transaction as PrismaService);

      await expect(
        handler.handle("missing-flight", actor.id, false),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
