import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { UpdateCatTreatmentHandler } from "./update-cat-treatment.handler";

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);

describe("UpdateCatTreatmentHandler", () => {
  it("rejects a missing treatment", async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({ data: { email: `${Date.now()}-missing-update@example.com` } });
      await expect(new UpdateCatTreatmentHandler(tx as PrismaService).handle("missing", {}, actor.id, false)).rejects.toThrow("Treatment not found");
    });
  });

  it("rejects an end date before the resulting start date", async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({ data: { email: `${Date.now()}-date-update@example.com` } });
      const cat = await tx.cat.create({ data: { name: "Date cat" } });
      const treatment = await tx.catTreatment.create({ data: { catId: cat.id, shortName: "Drug", instructions: "Do", startDate: day("2026-09-10"), endDate: null, dosesPerDay: 1 } });
      await expect(new UpdateCatTreatmentHandler(tx as PrismaService).handle(treatment.id, { endDate: day("2026-09-09") }, actor.id, false)).rejects.toThrow("endDate cannot be before");
    });
  });

  it("preserves the validity of recorded administrations when changing dates or doses", async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({ data: { email: `${Date.now()}-record-update@example.com` } });
      const cat = await tx.cat.create({ data: { name: "Record cat" } });
      const treatment = await tx.catTreatment.create({ data: { catId: cat.id, shortName: "Drug", instructions: "Do", startDate: day("2026-09-01"), endDate: day("2026-09-10"), dosesPerDay: 2 } });
      await tx.catTreatmentAdministration.create({ data: { treatmentId: treatment.id, administeredOn: day("2026-09-09"), doseNumber: 2, checkedByUserId: actor.id } });
      await expect(new UpdateCatTreatmentHandler(tx as PrismaService).handle(treatment.id, { endDate: day("2026-09-08") }, actor.id, false)).rejects.toThrow("exclude recorded");
    });
  });

  it("rejects reducing configured doses when the removed dose has been recorded", async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({ data: { email: `${Date.now()}-dose-update@example.com` } });
      const cat = await tx.cat.create({ data: { name: "Dose cat" } });
      const treatment = await tx.catTreatment.create({ data: { catId: cat.id, shortName: "Drug", instructions: "Do", startDate: day("2026-09-01"), endDate: null, dosesPerDay: 2 } });
      await tx.catTreatmentAdministration.create({ data: { treatmentId: treatment.id, administeredOn: day("2026-09-01"), doseNumber: 2, checkedByUserId: actor.id } });
      await expect(new UpdateCatTreatmentHandler(tx as PrismaService).handle(treatment.id, { dosesPerDay: 1 }, actor.id, false)).rejects.toThrow("Cannot reduce");
    });
  });

  it("permits reducing doses and moving an open-ended period when no administration is excluded", async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({ data: { email: `${Date.now()}-valid-reduce-update@example.com` } });
      const cat = await tx.cat.create({ data: { name: "Valid reduce cat" } });
      const treatment = await tx.catTreatment.create({ data: { catId: cat.id, shortName: "Drug", instructions: "Do", startDate: day("2026-09-01"), endDate: null, dosesPerDay: 2 } });
      await expect(new UpdateCatTreatmentHandler(tx as PrismaService).handle(treatment.id, { startDate: day("2026-09-02"), dosesPerDay: 1 }, actor.id, false)).resolves.toEqual({ id: treatment.id });
    });
  });

  it("does not add audit events when supplied fields have their existing values", async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({ data: { email: `${Date.now()}-unchanged-update@example.com` } });
      const cat = await tx.cat.create({ data: { name: "Unchanged cat" } });
      const treatment = await tx.catTreatment.create({ data: { catId: cat.id, shortName: "Same", instructions: "Same", startDate: day("2026-09-01"), endDate: day("2026-09-02"), dosesPerDay: 1 } });
      await new UpdateCatTreatmentHandler(tx as PrismaService).handle(treatment.id, { shortName: "Same", instructions: "Same", startDate: day("2026-09-01"), endDate: day("2026-09-02"), dosesPerDay: 1 }, actor.id, false);
      await expect(tx.catAuditEvent.count({ where: { catId: cat.id } })).resolves.toBe(0);
    });
  });

  it("allows clearing an end date and audits that field", async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({ data: { email: `${Date.now()}-clear-end-update@example.com` } });
      const cat = await tx.cat.create({ data: { name: "Clear end cat" } });
      const treatment = await tx.catTreatment.create({ data: { catId: cat.id, shortName: "Drug", instructions: "Do", startDate: day("2026-09-01"), endDate: day("2026-09-02"), dosesPerDay: 1 } });
      await new UpdateCatTreatmentHandler(tx as PrismaService).handle(treatment.id, { endDate: null }, actor.id, false);
      await expect(tx.catAuditEvent.findFirstOrThrow({ where: { catId: cat.id, eventType: "treatment_end_date_changed" } })).resolves.toMatchObject({ oldValue: "2026-09-02", newValue: "none" });
    });
  });

  it("updates every field and writes a field-specific audit event", async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({ data: { email: `${Date.now()}-success-update@example.com` } });
      const cat = await tx.cat.create({ data: { name: "Success cat" } });
      const treatment = await tx.catTreatment.create({ data: { catId: cat.id, shortName: "Before", instructions: "Old", startDate: day("2026-09-01"), endDate: null, dosesPerDay: 1 } });
      await expect(new UpdateCatTreatmentHandler(tx as PrismaService).handle(treatment.id, { shortName: "After", instructions: "New", startDate: day("2026-09-02"), endDate: day("2026-09-04"), dosesPerDay: 2 }, actor.id, false)).resolves.toEqual({ id: treatment.id });
      await expect(tx.catTreatment.findUniqueOrThrow({ where: { id: treatment.id } })).resolves.toMatchObject({ shortName: "After", instructions: "New", dosesPerDay: 2 });
      await expect(tx.catAuditEvent.count({ where: { catId: cat.id, eventType: { in: ["treatment_short_name_changed", "treatment_instructions_changed", "treatment_start_date_changed", "treatment_end_date_changed", "treatment_doses_per_day_changed"] } } })).resolves.toBe(5);
    });
  });
});
