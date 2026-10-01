import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import {
  createFlightTestActor,
  createFlightFixture,
} from "../flight-test-fixtures";
import { UpdateFlightCommand } from "./update-flight.command";
import { UpdateFlightHandler } from "./update-flight.handler";

describe("UpdateFlightHandler", () => {
  it("persists each changed field and writes one scalar audit event per field", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const flight = await createFlightFixture(transaction);
      const handler = new UpdateFlightHandler(transaction as PrismaService);

      await handler.handle(
        new UpdateFlightCommand(
          flight.id,
          new Date("2026-11-16"),
          "Paphos",
          "CY456",
          "Taylor Parent",
          actor.id,
          false,
        ),
      );

      const saved = await transaction.flight.findUniqueOrThrow({
        where: { id: flight.id },
      });
      expect(saved).toMatchObject({
        date: new Date("2026-11-16"),
        airport: "Paphos",
        flightNumber: "CY456",
        flightParent: "Taylor Parent",
      });
      expect(saved.concurrencyToken).not.toBe(flight.concurrencyToken);
      const events = await transaction.flightAuditEvent.findMany({
        where: { flightId: flight.id },
      });
      expect(events).toHaveLength(4);
      expect(events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            eventType: "flight_date_changed",
            oldValue: "2026-10-15",
            newValue: "2026-11-16",
            actorUserId: actor.id,
          }),
          expect.objectContaining({
            eventType: "flight_airport_changed",
            oldValue: flight.airport,
            newValue: "Paphos",
            actorUserId: actor.id,
          }),
          expect.objectContaining({
            eventType: "flight_number_changed",
            oldValue: flight.flightNumber,
            newValue: "CY456",
            actorUserId: actor.id,
          }),
          expect.objectContaining({
            eventType: "flight_parent_changed",
            oldValue: flight.flightParent,
            newValue: "Taylor Parent",
            actorUserId: actor.id,
          }),
        ]),
      );
    });
  });

  it("does not mutate or audit when no supplied fields change", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const flight = await createFlightFixture(transaction);
      const handler = new UpdateFlightHandler(transaction as PrismaService);

      await handler.handle(
        new UpdateFlightCommand(
          flight.id,
          undefined,
          undefined,
          undefined,
          undefined,
          actor.id,
          false,
        ),
      );

      expect(
        await transaction.flight.findUniqueOrThrow({
          where: { id: flight.id },
        }),
      ).toMatchObject({ concurrencyToken: flight.concurrencyToken });
      await expect(
        transaction.flightAuditEvent.count({ where: { flightId: flight.id } }),
      ).resolves.toBe(0);
    });
  });

  it("does not audit values identical to the current flight", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const flight = await createFlightFixture(transaction);
      const handler = new UpdateFlightHandler(transaction as PrismaService);

      await handler.handle(
        new UpdateFlightCommand(
          flight.id,
          flight.date,
          flight.airport,
          flight.flightNumber,
          flight.flightParent,
          actor.id,
          false,
        ),
      );

      expect(
        (
          await transaction.flight.findUniqueOrThrow({
            where: { id: flight.id },
          })
        ).concurrencyToken,
      ).toBe(flight.concurrencyToken);
      await expect(
        transaction.flightAuditEvent.count({ where: { flightId: flight.id } }),
      ).resolves.toBe(0);
    });
  });

  it("rejects a missing flight", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const handler = new UpdateFlightHandler(transaction as PrismaService);

      await expect(
        handler.handle(
          new UpdateFlightCommand(
            "missing-flight",
            undefined,
            undefined,
            undefined,
            undefined,
            actor.id,
            false,
          ),
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  it("rejects an other-partition flight", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const testFlight = await createFlightFixture(transaction, {
        isTest: true,
      });
      const handler = new UpdateFlightHandler(transaction as PrismaService);

      await expect(
        handler.handle(
          new UpdateFlightCommand(
            testFlight.id,
            undefined,
            undefined,
            undefined,
            undefined,
            actor.id,
            false,
          ),
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
