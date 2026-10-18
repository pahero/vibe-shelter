import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { ListVaccinationsHandler } from "./list-vaccinations.handler";

describe("ListVaccinationsHandler", () => {
  it("returns active vaccinations in descending date order with nullable fields", async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await tx.cat.create({ data: { name: `Vax list ${crypto.randomUUID()}` } });
      await tx.vaccination.createMany({ data: [
        { catId: cat.id, type: "CORE", date: new Date("2026-01-01"), concurrencyToken: crypto.randomUUID() },
        { catId: cat.id, type: "RABIES", date: new Date("2026-02-01"), vaccineName: "R", concurrencyToken: crypto.randomUUID() },
        { catId: cat.id, type: "OTHER", date: new Date("2026-03-01"), deletedAt: new Date(), concurrencyToken: crypto.randomUUID() },
      ] });
      const result = await new ListVaccinationsHandler(tx as PrismaService).handle(cat.id, false);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ type: "RABIES", date: "2026-02-01", nextDueDate: null, vaccineName: "R" });
      expect(result[1]).toMatchObject({ type: "CORE", date: "2026-01-01", nextDueDate: null, vaccineName: null });
    });
  });

  it("rejects cats outside the partition", async () => {
    await runInTestTransaction(async (tx) => {
      const handler = new ListVaccinationsHandler(tx as PrismaService);
      const cat = await tx.cat.create({ data: { name: `Test partition ${crypto.randomUUID()}`, isTest: true } });
      await expect(handler.handle(cat.id, false)).rejects.toThrow(new NotFoundException("Cat not found"));
    });
  });

  it("rejects deleted cats", async () => {
    await runInTestTransaction(async (tx) => {
      const handler = new ListVaccinationsHandler(tx as PrismaService);
      const deleted = await tx.cat.create({ data: { name: `Deleted vax ${crypto.randomUUID()}`, deletedAt: new Date() } });
      await expect(handler.handle(deleted.id, false)).rejects.toThrow(new NotFoundException("Cat not found"));
    });
  });
});
