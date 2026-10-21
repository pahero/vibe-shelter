import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { SetCatFlightCandidateHandler } from "./set-cat-flight-candidate.handler";

describe("SetCatFlightCandidateHandler", () => {
  it("marks and unmarks a cat, auditing each state change", async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({ data: { email: `${Date.now()}-${Math.random()}@example.com` } });
      const cat = await tx.cat.create({ data: { name: `Candidate ${Date.now()}-${Math.random()}` } });
      const handler = new SetCatFlightCandidateHandler(tx as PrismaService);
      await expect(handler.handle(cat.id, true, actor.id, false)).resolves.toEqual({ id: cat.id });
      await expect(handler.handle(cat.id, false, actor.id, false)).resolves.toEqual({ id: cat.id });
      await expect(tx.auditEvent.findMany({ where: { catId: cat.id }, orderBy: { occurredAt: "asc" } })).resolves.toMatchObject([
        { eventType: "flight_candidate_changed", oldValue: "false", newValue: "true", isTest: false },
        { eventType: "flight_candidate_changed", oldValue: "true", newValue: "false", isTest: false },
      ]);
      await expect(tx.cat.findUniqueOrThrow({ where: { id: cat.id } })).resolves.toMatchObject({ isFlightCandidate: false });
    });
  });

  it("does not create duplicate audit events when state is unchanged", async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({ data: { email: `${Date.now()}-${Math.random()}@example.com` } });
      const cat = await tx.cat.create({ data: { name: `Candidate ${Date.now()}-${Math.random()}` } });
      await new SetCatFlightCandidateHandler(tx as PrismaService).handle(cat.id, false, actor.id, false);
      await expect(tx.auditEvent.count({ where: { catId: cat.id } })).resolves.toBe(0);
    });
  });

  it("does not mutate cats outside the user's partition", async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await tx.cat.create({ data: { name: `Test candidate ${Date.now()}-${Math.random()}`, isTest: true } });
      await expect(new SetCatFlightCandidateHandler(tx as PrismaService).handle(cat.id, true, "unused", false)).rejects.toThrow(NotFoundException);
    });
  });
});
