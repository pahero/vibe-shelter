import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { SetCatTreatmentAdministrationHandler } from "./set-cat-treatment-administration.handler";

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);

describe("SetCatTreatmentAdministrationHandler", () => {
  it("rejects missing treatments", async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({ data: { email: `${Date.now()}-missing-admin@example.com` } });
      await expect(new SetCatTreatmentAdministrationHandler(tx as PrismaService).handle("missing", { date: day("2026-09-01"), doseNumber: 1, checked: true }, actor.id, false)).rejects.toThrow("Treatment not found");
    });
  });

  it("rejects doses not configured for the treatment", async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({ data: { email: `${Date.now()}-dose-admin@example.com` } });
      const cat = await tx.cat.create({ data: { name: "Admin cat" } });
      const treatment = await tx.catTreatment.create({ data: { catId: cat.id, shortName: "Drug", instructions: "Do", startDate: day("2026-09-01"), endDate: null, dosesPerDay: 1 } });
      await expect(new SetCatTreatmentAdministrationHandler(tx as PrismaService).handle(treatment.id, { date: day("2026-09-01"), doseNumber: 2, checked: true }, actor.id, false)).rejects.toThrow("not configured");
    });
  });

  it("rejects dates before a treatment period", async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({ data: { email: `${Date.now()}-period-admin@example.com` } });
      const cat = await tx.cat.create({ data: { name: "Period cat" } });
      const treatment = await tx.catTreatment.create({ data: { catId: cat.id, shortName: "Drug", instructions: "Do", startDate: day("2026-09-02"), endDate: day("2026-09-03"), dosesPerDay: 1 } });
      await expect(new SetCatTreatmentAdministrationHandler(tx as PrismaService).handle(treatment.id, { date: day("2026-09-01"), doseNumber: 1, checked: true }, actor.id, false)).rejects.toThrow("outside");
    });
  });

  it("rejects dates after a finite treatment period", async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({ data: { email: `${Date.now()}-after-admin@example.com` } });
      const cat = await tx.cat.create({ data: { name: "After cat" } });
      const treatment = await tx.catTreatment.create({ data: { catId: cat.id, shortName: "Drug", instructions: "Do", startDate: day("2026-09-02"), endDate: day("2026-09-03"), dosesPerDay: 1 } });
      await expect(new SetCatTreatmentAdministrationHandler(tx as PrismaService).handle(treatment.id, { date: day("2026-09-04"), doseNumber: 1, checked: true }, actor.id, false)).rejects.toThrow("outside");
    });
  });

  it("creates an administration with its checker and audit event", async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({ data: { email: `${Date.now()}-create-admin@example.com` } });
      const cat = await tx.cat.create({ data: { name: "Create admin cat" } });
      const treatment = await tx.catTreatment.create({ data: { catId: cat.id, shortName: "Drug", instructions: "Do", startDate: day("2026-09-01"), endDate: null, dosesPerDay: 1 } });
      await expect(new SetCatTreatmentAdministrationHandler(tx as PrismaService).handle(treatment.id, { date: day("2026-09-01"), doseNumber: 1, checked: true }, actor.id, false)).resolves.toEqual({ id: treatment.id });
      await expect(tx.catTreatmentAdministration.findUniqueOrThrow({ where: { treatmentId_administeredOn_doseNumber: { treatmentId: treatment.id, administeredOn: day("2026-09-01"), doseNumber: 1 } } })).resolves.toMatchObject({ checkedByUserId: actor.id });
      await expect(tx.catAuditEvent.findFirstOrThrow({ where: { catId: cat.id, eventType: "treatment_administration_checked" } })).resolves.toMatchObject({ actorUserId: actor.id });
    });
  });

  it("removes an administration and audits the unchecked state", async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({ data: { email: `${Date.now()}-remove-admin@example.com` } });
      const cat = await tx.cat.create({ data: { name: "Remove admin cat" } });
      const treatment = await tx.catTreatment.create({ data: { catId: cat.id, shortName: "Drug", instructions: "Do", startDate: day("2026-09-01"), endDate: null, dosesPerDay: 1 } });
      await tx.catTreatmentAdministration.create({ data: { treatmentId: treatment.id, administeredOn: day("2026-09-01"), doseNumber: 1, checkedByUserId: actor.id } });
      await new SetCatTreatmentAdministrationHandler(tx as PrismaService).handle(treatment.id, { date: day("2026-09-01"), doseNumber: 1, checked: false }, actor.id, false);
      await expect(tx.catTreatmentAdministration.count({ where: { treatmentId: treatment.id } })).resolves.toBe(0);
      await expect(tx.catAuditEvent.findFirstOrThrow({ where: { catId: cat.id, eventType: "treatment_administration_unchecked" } })).resolves.toMatchObject({ oldValue: "2026-09-01 dose 1" });
    });
  });

  it("is idempotent and does not audit an already matching state", async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({ data: { email: `${Date.now()}-same-admin@example.com` } });
      const cat = await tx.cat.create({ data: { name: "Same admin cat" } });
      const treatment = await tx.catTreatment.create({ data: { catId: cat.id, shortName: "Drug", instructions: "Do", startDate: day("2026-09-01"), endDate: null, dosesPerDay: 1 } });
      await new SetCatTreatmentAdministrationHandler(tx as PrismaService).handle(treatment.id, { date: day("2026-09-01"), doseNumber: 1, checked: false }, actor.id, false);
      await expect(tx.catAuditEvent.count({ where: { catId: cat.id } })).resolves.toBe(0);
    });
  });
});
