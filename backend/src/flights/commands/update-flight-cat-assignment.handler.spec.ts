import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { createFlightAssignment, createFlightFixture, createFlightTestActor, createFlightTestCat } from "../flight-test-fixtures";
import { UpdateFlightCatAssignmentCommand } from "./update-flight-cat-assignment.command";
import { UpdateFlightCatAssignmentHandler } from "./update-flight-cat-assignment.handler";

describe("UpdateFlightCatAssignmentHandler", () => {
  it("updates and separately audits both cat checklist values", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const flight = await createFlightFixture(transaction);
      const cat = await createFlightTestCat(transaction);
      const assignment = await createFlightAssignment(transaction, flight.id, cat.id);
      const handler = new UpdateFlightCatAssignmentHandler(transaction as PrismaService);

      await handler.handle(new UpdateFlightCatAssignmentCommand(assignment.id, true, true, actor.id, false));

      const saved = await transaction.flightCatAssignment.findUniqueOrThrow({ where: { id: assignment.id } });
      expect(saved).toMatchObject({ f2fDone: true, tracesDone: true });
      expect(saved.concurrencyToken).not.toBe(assignment.concurrencyToken);
      expect((await transaction.flight.findUniqueOrThrow({ where: { id: flight.id } })).concurrencyToken).not.toBe(flight.concurrencyToken);
      expect(await transaction.flightAuditEvent.findMany({ where: { assignmentId: assignment.id } })).toEqual(expect.arrayContaining([
        expect.objectContaining({ eventType: "flight_cat_f2f_changed", oldValue: "false", newValue: "true", catId: cat.id, actorUserId: actor.id }),
        expect.objectContaining({ eventType: "flight_cat_traces_changed", oldValue: "false", newValue: "true", catId: cat.id, actorUserId: actor.id }),
      ]));
    });
  });

  it("leaves tokens and history unchanged when status values are omitted or unchanged", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const flight = await createFlightFixture(transaction);
      const cat = await createFlightTestCat(transaction);
      const assignment = await createFlightAssignment(transaction, flight.id, cat.id);
      const handler = new UpdateFlightCatAssignmentHandler(transaction as PrismaService);

      await handler.handle(new UpdateFlightCatAssignmentCommand(assignment.id, false, undefined, actor.id, false));

      expect((await transaction.flightCatAssignment.findUniqueOrThrow({ where: { id: assignment.id } })).concurrencyToken).toBe(assignment.concurrencyToken);
      expect((await transaction.flight.findUniqueOrThrow({ where: { id: flight.id } })).concurrencyToken).toBe(flight.concurrencyToken);
      await expect(transaction.flightAuditEvent.count({ where: { flightId: flight.id } })).resolves.toBe(0);
    });
  });

  it("does not audit values identical to both current statuses", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const flight = await createFlightFixture(transaction);
      const cat = await createFlightTestCat(transaction);
      const assignment = await createFlightAssignment(transaction, flight.id, cat.id);
      const handler = new UpdateFlightCatAssignmentHandler(transaction as PrismaService);

      await handler.handle(new UpdateFlightCatAssignmentCommand(assignment.id, false, false, actor.id, false));

      expect((await transaction.flightCatAssignment.findUniqueOrThrow({ where: { id: assignment.id } })).concurrencyToken).toBe(assignment.concurrencyToken);
      await expect(transaction.flightAuditEvent.count({ where: { flightId: flight.id } })).resolves.toBe(0);
    });
  });

  it("rejects a missing assignment", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const handler = new UpdateFlightCatAssignmentHandler(transaction as PrismaService);

      await expect(handler.handle(new UpdateFlightCatAssignmentCommand("missing-assignment", true, undefined, actor.id, false))).rejects.toThrow(NotFoundException);
    });
  });

  it("rejects an assignment in the other partition", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const testFlight = await createFlightFixture(transaction, { isTest: true });
      const cat = await createFlightTestCat(transaction, true);
      const assignment = await createFlightAssignment(transaction, testFlight.id, cat.id);
      const handler = new UpdateFlightCatAssignmentHandler(transaction as PrismaService);

      await expect(handler.handle(new UpdateFlightCatAssignmentCommand(assignment.id, true, undefined, actor.id, false))).rejects.toThrow(NotFoundException);
    });
  });
});
