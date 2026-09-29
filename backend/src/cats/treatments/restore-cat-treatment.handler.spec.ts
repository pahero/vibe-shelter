import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { RestoreCatTreatmentHandler } from "./restore-cat-treatment.handler";

describe("RestoreCatTreatmentHandler", () => {
  it("restores a deleted treatment and records a value-free audit event", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await transaction.user.create({ data: { email: `${Date.now()}-restore-treatment@example.com` } });
      const cat = await transaction.cat.create({ data: { name: "Restore treatment cat" } });
      const treatment = await transaction.catTreatment.create({ data: { catId: cat.id, shortName: "Antibiotic", instructions: null, startDate: new Date("2026-09-01T00:00:00.000Z"), dosesPerDay: 1, deletedAt: new Date() } });
      await expect(new RestoreCatTreatmentHandler(transaction as PrismaService).handle(treatment.id, actor.id, false)).resolves.toEqual({ id: treatment.id });
      await expect(transaction.catTreatment.findUniqueOrThrow({ where: { id: treatment.id } })).resolves.toMatchObject({ deletedAt: null });
      await expect(transaction.catAuditEvent.findFirstOrThrow({ where: { catId: cat.id, eventType: "treatment_restored" } })).resolves.toMatchObject({ treatmentId: treatment.id, actorUserId: actor.id, oldValue: null, newValue: null });
    });
  });

  it("reports that an active treatment cannot be restored", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await transaction.user.create({ data: { email: `${Date.now()}-active-treatment@example.com` } });
      const cat = await transaction.cat.create({ data: { name: "Active treatment cat" } });
      const treatment = await transaction.catTreatment.create({ data: { catId: cat.id, shortName: "Antibiotic", instructions: null, startDate: new Date("2026-09-01T00:00:00.000Z"), dosesPerDay: 1 } });
      await expect(new RestoreCatTreatmentHandler(transaction as PrismaService).handle(treatment.id, actor.id, false)).rejects.toThrow("Treatment is not deleted and cannot be restored");
    });
  });

  it("rejects missing treatments", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await transaction.user.create({ data: { email: `${Date.now()}-missing-restore-treatment@example.com` } });
      await expect(new RestoreCatTreatmentHandler(transaction as PrismaService).handle("missing", actor.id, false)).rejects.toThrow("Deleted treatment not found");
    });
  });
});
