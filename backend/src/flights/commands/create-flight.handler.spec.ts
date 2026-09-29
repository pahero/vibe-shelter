import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { createFlightTestActor } from "../flight-test-fixtures";
import { CreateFlightCommand } from "./create-flight.command";
import { CreateFlightHandler } from "./create-flight.handler";

describe("CreateFlightHandler", () => {
  it("persists a flight and emits a value-free creation audit event", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const handler = new CreateFlightHandler(transaction as PrismaService);

      const result = await handler.handle(new CreateFlightCommand(
        new Date("2026-10-15"), "Larnaca", "CY123", "Morgan Parent", actor.id, true,
      ));

      expect(await transaction.flight.findUniqueOrThrow({ where: { id: result.id } })).toMatchObject({
        date: new Date("2026-10-15"), airport: "Larnaca", flightNumber: "CY123", flightParent: "Morgan Parent", isTest: true,
      });
      expect(await transaction.flightAuditEvent.findFirstOrThrow({ where: { flightId: result.id } })).toMatchObject({
        eventType: "flight_created", actorUserId: actor.id, oldValue: null, newValue: null,
      });
    });
  });
});
