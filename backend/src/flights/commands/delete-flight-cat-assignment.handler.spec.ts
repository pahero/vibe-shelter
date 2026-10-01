import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import {
  createFlightAssignment,
  createFlightFixture,
  createFlightTestActor,
  createFlightTestCat,
} from "../flight-test-fixtures";
import { DeleteFlightCatAssignmentHandler } from "./delete-flight-cat-assignment.handler";

describe("DeleteFlightCatAssignmentHandler", () => {
  it("soft-deletes an assignment, bumps both tokens, and writes a value-free cat-linked event", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const flight = await createFlightFixture(transaction);
      const cat = await createFlightTestCat(transaction);
      const assignment = await createFlightAssignment(
        transaction,
        flight.id,
        cat.id,
      );
      const handler = new DeleteFlightCatAssignmentHandler(
        transaction as PrismaService,
      );

      await handler.handle(assignment.id, actor.id, false);

      const saved = await transaction.flightCatAssignment.findUniqueOrThrow({
        where: { id: assignment.id },
      });
      expect(saved.deletedAt).toBeInstanceOf(Date);
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
        eventType: "flight_cat_unassigned",
        catId: cat.id,
        oldValue: null,
        newValue: null,
      });
    });
  });

  it("rejects a missing assignment", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const handler = new DeleteFlightCatAssignmentHandler(
        transaction as PrismaService,
      );

      await expect(
        handler.handle("missing-assignment", actor.id, false),
      ).rejects.toThrow(NotFoundException);
    });
  });

  it("rejects a deleted assignment", async () => {
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
      const handler = new DeleteFlightCatAssignmentHandler(
        transaction as PrismaService,
      );

      await expect(handler.handle(deleted.id, actor.id, false)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
