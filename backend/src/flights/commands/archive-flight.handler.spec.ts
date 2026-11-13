import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import {
  createFlightAssignment,
  createFlightFixture,
  createFlightTestActor,
  createFlightTestCat,
} from "../flight-test-fixtures";
import { ArchiveFlightHandler } from "./archive-flight.handler";

describe("ArchiveFlightHandler", () => {
  it("archives an active flight with a new token and value-free audit event", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const flight = await createFlightFixture(transaction);
      const candidate = await createFlightTestCat(transaction);
      await transaction.cat.update({
        where: { id: candidate.id },
        data: { isFlightCandidate: true },
      });
      await createFlightAssignment(transaction, flight.id, candidate.id);
      const nonCandidate = await createFlightTestCat(transaction);
      await createFlightAssignment(transaction, flight.id, nonCandidate.id);
      await new ArchiveFlightHandler(transaction as PrismaService).handle(
        flight.id,
        actor.id,
        false,
      );
      const saved = await transaction.flight.findUniqueOrThrow({
        where: { id: flight.id },
      });
      expect(saved.archivedAt).toBeInstanceOf(Date);
      expect(saved.concurrencyToken).not.toBe(flight.concurrencyToken);
      const savedCandidate = await transaction.cat.findUniqueOrThrow({
        where: { id: candidate.id },
      });
      expect(savedCandidate.isFlightCandidate).toBe(false);
      expect(savedCandidate.concurrencyToken).not.toBe(
        candidate.concurrencyToken,
      );
      expect(
        await transaction.auditEvent.findFirstOrThrow({
          where: { catId: candidate.id, eventType: "flight_candidate_changed" },
        }),
      ).toMatchObject({ oldValue: "true", newValue: "false" });
      expect(
        await transaction.auditEvent.count({
          where: {
            catId: nonCandidate.id,
            eventType: "flight_candidate_changed",
          },
        }),
      ).toBe(0);
      expect(
        await transaction.auditEvent.findFirstOrThrow({
          where: { flightId: flight.id },
        }),
      ).toMatchObject({
        eventType: "flight_archived",
        oldValue: null,
        newValue: null,
      });
    });
  });

  it("rejects a missing, deleted, archived, or other-partition flight", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await createFlightTestActor(transaction);
      const archived = await createFlightFixture(transaction, {
        archivedAt: new Date(),
      });
      const deleted = await createFlightFixture(transaction, {
        deletedAt: new Date(),
      });
      const testFlight = await createFlightFixture(transaction, {
        isTest: true,
      });
      const handler = new ArchiveFlightHandler(transaction as PrismaService);
      for (const id of ["missing", archived.id, deleted.id, testFlight.id]) {
        await expect(handler.handle(id, actor.id, false)).rejects.toThrow(
          NotFoundException,
        );
      }
    });
  });
});
