import { ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import {
  createFlightAssignment,
  createFlightFixture,
  createFlightTestActor,
  createFlightTestCat,
} from "../flight-test-fixtures";
import { RestoreFlightCatAssignmentHandler } from "./restore-flight-cat-assignment.handler";

describe("RestoreFlightCatAssignmentHandler", () => {
  it("restores an assignment, updates tokens, and records a value-free event", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const flight = await createFlightFixture(transaction);
      const cat = await createFlightTestCat(transaction);
      const assignment = await createFlightAssignment(
        transaction,
        flight.id,
        cat.id,
        { deletedAt: new Date() },
      );
      const handler = new RestoreFlightCatAssignmentHandler(
        transaction as PrismaService,
      );

      await expect(
        handler.handle(assignment.id, actor.id, false),
      ).resolves.toEqual({ id: assignment.id });

      const saved = await transaction.flightCatAssignment.findUniqueOrThrow({
        where: { id: assignment.id },
      });
      expect(saved.deletedAt).toBeNull();
      expect(saved.concurrencyToken).not.toBe(assignment.concurrencyToken);
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
        eventType: "flight_cat_restored",
        catId: cat.id,
        oldValue: null,
        newValue: null,
      });
    });
  });

  it("rejects a duplicate active assignment", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const flight = await createFlightFixture(transaction);
      const cat = await createFlightTestCat(transaction);
      const deleted = await createFlightAssignment(
        transaction,
        flight.id,
        cat.id,
        { deletedAt: new Date() },
      );
      await createFlightAssignment(transaction, flight.id, cat.id);
      const handler = new RestoreFlightCatAssignmentHandler(
        transaction as PrismaService,
      );

      await expect(handler.handle(deleted.id, actor.id, false)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  it("rejects a missing assignment", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const handler = new RestoreFlightCatAssignmentHandler(
        transaction as PrismaService,
      );

      await expect(
        handler.handle("missing-assignment", actor.id, false),
      ).rejects.toThrow(NotFoundException);
    });
  });

  it("rejects an active assignment", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const flight = await createFlightFixture(transaction);
      const cat = await createFlightTestCat(transaction);
      const active = await createFlightAssignment(
        transaction,
        flight.id,
        cat.id,
      );
      const handler = new RestoreFlightCatAssignmentHandler(
        transaction as PrismaService,
      );

      await expect(handler.handle(active.id, actor.id, false)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  it("rejects an other-partition assignment", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const testFlight = await createFlightFixture(transaction, {
        isTest: true,
      });
      const testCat = await createFlightTestCat(transaction, true);
      const testDeleted = await createFlightAssignment(
        transaction,
        testFlight.id,
        testCat.id,
        { deletedAt: new Date() },
      );
      const handler = new RestoreFlightCatAssignmentHandler(
        transaction as PrismaService,
      );

      await expect(
        handler.handle(testDeleted.id, actor.id, false),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
