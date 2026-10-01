import { ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import {
  createFlightFixture,
  createFlightTestActor,
  createFlightTestCat,
} from "../flight-test-fixtures";
import { AssignCatToFlightCommand } from "./assign-cat-to-flight.command";
import { AssignCatToFlightHandler } from "./assign-cat-to-flight.handler";

describe("AssignCatToFlightHandler", () => {
  it("creates a default assignment, bumps the flight token, and audits the linked cat", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const flight = await createFlightFixture(transaction);
      const cat = await createFlightTestCat(transaction);
      const handler = new AssignCatToFlightHandler(
        transaction as PrismaService,
      );

      const result = await handler.handle(
        new AssignCatToFlightCommand(flight.id, cat.id, actor.id, false),
      );

      const assignment =
        await transaction.flightCatAssignment.findUniqueOrThrow({
          where: { id: result.id },
        });
      expect(assignment).toMatchObject({
        flightId: flight.id,
        catId: cat.id,
        f2fDone: false,
        tracesDone: false,
        deletedAt: null,
      });
      expect(
        (
          await transaction.flight.findUniqueOrThrow({
            where: { id: flight.id },
          })
        ).concurrencyToken,
      ).not.toBe(flight.concurrencyToken);
      expect(
        await transaction.flightAuditEvent.findFirstOrThrow({
          where: { assignmentId: assignment.id },
        }),
      ).toMatchObject({
        flightId: flight.id,
        catId: cat.id,
        eventType: "flight_cat_assigned",
        oldValue: null,
        newValue: null,
        actorUserId: actor.id,
      });
    });
  });

  it("rejects a missing flight", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const cat = await createFlightTestCat(transaction);
      const handler = new AssignCatToFlightHandler(
        transaction as PrismaService,
      );

      await expect(
        handler.handle(
          new AssignCatToFlightCommand(
            "missing-flight",
            cat.id,
            actor.id,
            false,
          ),
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  it("rejects a missing cat", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const flight = await createFlightFixture(transaction);
      const handler = new AssignCatToFlightHandler(
        transaction as PrismaService,
      );

      await expect(
        handler.handle(
          new AssignCatToFlightCommand(
            flight.id,
            "missing-cat",
            actor.id,
            false,
          ),
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  it("rejects an archived cat", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const flight = await createFlightFixture(transaction);
      const archivedCat = await transaction.cat.create({
        data: { name: "Archived flight cat", archivedAt: new Date() },
      });
      const handler = new AssignCatToFlightHandler(
        transaction as PrismaService,
      );

      await expect(
        handler.handle(
          new AssignCatToFlightCommand(
            flight.id,
            archivedCat.id,
            actor.id,
            false,
          ),
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  it("rejects an already assigned cat", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const flight = await createFlightFixture(transaction);
      const cat = await createFlightTestCat(transaction);
      await transaction.flightCatAssignment.create({
        data: { flightId: flight.id, catId: cat.id },
      });
      const handler = new AssignCatToFlightHandler(
        transaction as PrismaService,
      );

      await expect(
        handler.handle(
          new AssignCatToFlightCommand(flight.id, cat.id, actor.id, false),
        ),
      ).rejects.toThrow(ConflictException);
    });
  });
});
