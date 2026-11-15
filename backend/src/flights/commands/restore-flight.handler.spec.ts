import { ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import {
  createFlightAssignment,
  createFlightTestActor,
  createFlightFixture,
  createFlightTestCat,
} from "../flight-test-fixtures";
import { RestoreFlightHandler } from "./restore-flight.handler";

describe("RestoreFlightHandler", () => {
  it("restores a flight, updates its token, and writes a value-free audit event", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const flight = await createFlightFixture(transaction, {
        deletedAt: new Date(),
      });
      const handler = new RestoreFlightHandler(transaction as PrismaService);

      await expect(handler.handle(flight.id, actor.id, false)).resolves.toEqual(
        { id: flight.id },
      );

      const saved = await transaction.flight.findUniqueOrThrow({
        where: { id: flight.id },
      });
      expect(saved.deletedAt).toBeNull();
      expect(saved.concurrencyToken).not.toBe(flight.concurrencyToken);
      expect(
        await transaction.auditEvent.findFirstOrThrow({
          where: { flightId: flight.id },
        }),
      ).toMatchObject({
        eventType: "flight_restored",
        oldValue: null,
        newValue: null,
      });
    });
  });

  it("rejects an active flight", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const active = await createFlightFixture(transaction);
      const handler = new RestoreFlightHandler(transaction as PrismaService);

      await expect(handler.handle(active.id, actor.id, false)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  it("clears both archive and deletion timestamps when restoring an archived flight", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const archived = await createFlightFixture(transaction, {
        archivedAt: new Date(),
      });
      await new RestoreFlightHandler(transaction as PrismaService).handle(
        archived.id,
        actor.id,
        false,
      );
      const restored = await transaction.flight.findUniqueOrThrow({
        where: { id: archived.id },
      });
      expect(restored.archivedAt).toBeNull();
      expect(restored.deletedAt).toBeNull();
    });
  });

  it("restores assigned cats as flight candidates with tokens and audit events", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const archived = await createFlightFixture(transaction, {
        archivedAt: new Date(),
      });
      const candidateCat = await createFlightTestCat(transaction);
      const alreadyCandidate = await createFlightTestCat(transaction);
      await transaction.cat.update({
        where: { id: alreadyCandidate.id },
        data: { isFlightCandidate: true },
      });
      await createFlightAssignment(transaction, archived.id, candidateCat.id);
      await createFlightAssignment(
        transaction,
        archived.id,
        alreadyCandidate.id,
      );
      await createFlightAssignment(
        transaction,
        archived.id,
        (await createFlightTestCat(transaction)).id,
        { deletedAt: new Date() },
      );

      await new RestoreFlightHandler(transaction as PrismaService).handle(
        archived.id,
        actor.id,
        false,
      );

      const restoredCat = await transaction.cat.findUniqueOrThrow({
        where: { id: candidateCat.id },
      });
      expect(restoredCat.isFlightCandidate).toBe(true);
      expect(restoredCat.concurrencyToken).not.toBe(
        candidateCat.concurrencyToken,
      );
      expect(
        await transaction.auditEvent.findFirstOrThrow({
          where: {
            catId: candidateCat.id,
            eventType: "flight_candidate_changed",
          },
        }),
      ).toMatchObject({
        flightId: archived.id,
        oldValue: "false",
        newValue: "true",
      });
      expect(
        await transaction.auditEvent.count({
          where: {
            catId: alreadyCandidate.id,
            eventType: "flight_candidate_changed",
          },
        }),
      ).toBe(0);
    });
  });

  it("rejects restoration when an assigned cat has another active flight", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const archivedFlight = await createFlightFixture(transaction, {
        archivedAt: new Date(),
      });
      const activeFlight = await createFlightFixture(transaction);
      const cat = await createFlightTestCat(transaction);
      await createFlightAssignment(transaction, archivedFlight.id, cat.id);
      await createFlightAssignment(transaction, activeFlight.id, cat.id);
      const handler = new RestoreFlightHandler(transaction as PrismaService);

      await expect(
        handler.handle(archivedFlight.id, actor.id, false),
      ).rejects.toThrow("Cannot restore this flight because");

      const unchangedFlight = await transaction.flight.findUniqueOrThrow({
        where: { id: archivedFlight.id },
      });
      expect(unchangedFlight.archivedAt).toBeInstanceOf(Date);
      expect(unchangedFlight.concurrencyToken).toBe(
        archivedFlight.concurrencyToken,
      );
      expect(
        await transaction.auditEvent.count({
          where: { flightId: archivedFlight.id },
        }),
      ).toBe(0);
      expect(
        (await transaction.cat.findUniqueOrThrow({ where: { id: cat.id } }))
          .isFlightCandidate,
      ).toBe(false);
    });
  });

  it("rejects an other-partition deleted flight", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const testDeleted = await createFlightFixture(transaction, {
        isTest: true,
        deletedAt: new Date(),
      });
      const handler = new RestoreFlightHandler(transaction as PrismaService);

      await expect(
        handler.handle(testDeleted.id, actor.id, false),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
