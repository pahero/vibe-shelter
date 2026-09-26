import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { CreateCatTreatmentHandler } from "./create-cat-treatment.handler";

describe("CreateCatTreatmentHandler", () => {
  it("rejects a missing or differently partitioned cat", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await transaction.user.create({ data: { email: `${Date.now()}-missing-treatment@example.com` } });
      const handler = new CreateCatTreatmentHandler(transaction as PrismaService);
      await expect(handler.handle("missing", { shortName: "Antibiotic", instructions: "With food", startDate: new Date("2026-09-01T00:00:00.000Z"), endDate: null, dosesPerDay: 2 }, actor.id, false)).rejects.toThrow("Cat not found");
    });
  });

  it("creates the treatment and a value-free creation audit event", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await transaction.user.create({ data: { email: `${Date.now()}-treatment@example.com` } });
      const cat = await transaction.cat.create({ data: { name: `Cat ${Date.now()}` } });
      const result = await new CreateCatTreatmentHandler(transaction as PrismaService).handle(cat.id, { shortName: "Antibiotic", instructions: "With food", startDate: new Date("2026-09-01T00:00:00.000Z"), endDate: null, dosesPerDay: 2 }, actor.id, false);
      await expect(transaction.catTreatment.findUniqueOrThrow({ where: { id: result.id } })).resolves.toMatchObject({ catId: cat.id, shortName: "Antibiotic", dosesPerDay: 2 });
      await expect(transaction.catAuditEvent.findFirstOrThrow({ where: { catId: cat.id, eventType: "treatment_created" } })).resolves.toMatchObject({ actorUserId: actor.id, oldValue: null, newValue: null });
    });
  });
});
