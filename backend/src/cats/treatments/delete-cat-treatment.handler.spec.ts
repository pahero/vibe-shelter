import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { DeleteCatTreatmentHandler } from "./delete-cat-treatment.handler";

describe("DeleteCatTreatmentHandler", () => {
  it("rejects a missing treatment", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await transaction.user.create({ data: { email: `${Date.now()}-missing-delete-treatment@example.com` } });
      await expect(new DeleteCatTreatmentHandler(transaction as PrismaService).handle("missing", actor.id, false)).rejects.toThrow("Treatment not found");
    });
  });

  it("soft deletes a treatment, advances its token, and writes an audit event", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await transaction.user.create({ data: { email: `${Date.now()}-delete-treatment@example.com` } });
      const cat = await transaction.cat.create({ data: { name: `Delete treatment cat ${Date.now()}` } });
      const treatment = await transaction.catTreatment.create({ data: { catId: cat.id, shortName: "Pills", instructions: null, startDate: new Date("2026-09-01T00:00:00.000Z"), endDate: null, dosesPerDay: 1 } });
      const originalToken = treatment.concurrencyToken;
      await transaction.catTreatmentAdministration.create({ data: { treatmentId: treatment.id, administeredOn: new Date("2026-09-01T00:00:00.000Z"), doseNumber: 1, checkedByUserId: actor.id } });
      await new DeleteCatTreatmentHandler(transaction as PrismaService).handle(treatment.id, actor.id, false);
      await expect(transaction.catTreatment.findUniqueOrThrow({ where: { id: treatment.id } })).resolves.toMatchObject({ deletedAt: expect.any(Date), concurrencyToken: expect.not.stringMatching(originalToken) });
      await expect(transaction.catTreatmentAdministration.count({ where: { treatmentId: treatment.id } })).resolves.toBe(1);
      await expect(transaction.catAuditEvent.findFirstOrThrow({ where: { catId: cat.id, eventType: "treatment_deleted" } })).resolves.toMatchObject({ actorUserId: actor.id, oldValue: "Pills", newValue: null });
    });
  });
});
