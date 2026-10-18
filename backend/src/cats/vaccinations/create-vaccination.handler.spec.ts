import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { CreateVaccinationHandler } from "./create-vaccination.handler";

describe("CreateVaccinationHandler", () => {
  it("creates a vaccination, increments the cat version, and writes a value-free audit event", async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await tx.cat.create({ data: { name: `Vax ${crypto.randomUUID()}`, isTest: true } });
      const actor = await tx.user.create({ data: { email: `${crypto.randomUUID()}@example.com` } });
      const result = await new CreateVaccinationHandler(tx as PrismaService).handle(cat.id, {
        type: "CORE", date: new Date("2026-01-01"), nextDueDate: null, vaccineName: "Core vaccine",
      }, actor.id, true);
      expect(result.id).toBeTruthy();
      await expect(tx.vaccination.findUniqueOrThrow({ where: { id: result.id } })).resolves.toMatchObject({ catId: cat.id, type: "CORE", date: new Date("2026-01-01"), nextDueDate: null, vaccineName: "Core vaccine" });
      await expect(tx.cat.findUniqueOrThrow({ where: { id: cat.id } })).resolves.toMatchObject({ version: 1 });
      await expect(tx.auditEvent.findFirstOrThrow({ where: { vaccinationId: result.id } })).resolves.toMatchObject({ catId: cat.id, actorUserId: actor.id, isTest: true, eventType: "vaccination_created", oldValue: null, newValue: null });
    });
  });

  it("rejects a missing cat", async () => {
    await runInTestTransaction(async (tx) => {
      const handler = new CreateVaccinationHandler(tx as PrismaService);
      await expect(handler.handle("missing", { type: "OTHER", date: new Date("2026-01-01") }, "actor", false)).rejects.toThrow(new NotFoundException("Cat not found"));
    });
  });

  it("rejects a deleted cat", async () => {
    await runInTestTransaction(async (tx) => {
      const handler = new CreateVaccinationHandler(tx as PrismaService);
      const cat = await tx.cat.create({ data: { name: `Deleted ${crypto.randomUUID()}`, deletedAt: new Date() } });
      await expect(handler.handle(cat.id, { type: "OTHER", date: new Date("2026-01-01") }, "actor", false)).rejects.toThrow(new NotFoundException("Cat not found"));
    });
  });
});
