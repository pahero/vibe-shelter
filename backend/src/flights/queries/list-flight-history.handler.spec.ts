import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { createFlightFixture, createFlightTestActor, createFlightTestCat } from "../flight-test-fixtures";
import { ListFlightHistoryHandler } from "./list-flight-history.handler";

describe("ListFlightHistoryHandler", () => {
  it("returns full value-aware audit rows with actors and linked cat state, even for a deleted flight", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const flight = await createFlightFixture(transaction, { deletedAt: new Date() });
      const cat = await createFlightTestCat(transaction);
      await transaction.flightAuditEvent.create({
        data: {
          flightId: flight.id,
          catId: cat.id,
          actorUserId: actor.id,
          eventType: "flight_cat_f2f_changed",
          oldValue: "false",
          newValue: "true",
        },
      });
      const handler = new ListFlightHistoryHandler(transaction as PrismaService);

      const events = await handler.handle(flight.id, false);

      expect(events).toEqual(expect.arrayContaining([expect.objectContaining({
        eventType: "flight_cat_f2f_changed",
        oldValue: "false",
        newValue: "true",
        actor: { id: actor.id, displayName: "Flight Test Actor", email: actor.email },
        cat: { id: cat.id, name: cat.name, archivedAt: null },
        flight: expect.objectContaining({ id: flight.id, isDeleted: true }),
      })]));
    });
  });

  it("rejects a flight from a different test partition", async () => {
    await runInTestTransaction(async (transaction) => {
      const flight = await createFlightFixture(transaction, { isTest: true });
      const handler = new ListFlightHistoryHandler(transaction as PrismaService);

      await expect(handler.handle(flight.id, false)).rejects.toThrow(NotFoundException);
    });
  });
});
