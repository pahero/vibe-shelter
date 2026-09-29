import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { UpdateCatPreventiveTreatmentHandler } from "./update-cat-preventive-treatment.handler";

describe("UpdateCatPreventiveTreatmentHandler", () => {
  it("persists and audits every changed field", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await transaction.user.create({ data: { email: `vaccine-${Date.now()}@example.com` } });
      const cat = await transaction.cat.create({ data: { name: `Vaccine cat ${Date.now()}` } });
      const treatment = await transaction.catPreventiveTreatment.create({
        data: { catId: cat.id, date: new Date("2026-01-01"), name: "Old dose", type: "OTHER" },
      });
      const handler = new UpdateCatPreventiveTreatmentHandler(transaction as PrismaService);

      await expect(handler.handle(treatment.id, {
        date: new Date("2026-02-03"),
        name: "Updated dose",
        type: "RABIES",
      }, actor.id, false)).resolves.toEqual({ id: treatment.id });

      const saved = await transaction.catPreventiveTreatment.findUniqueOrThrow({ where: { id: treatment.id } });
      expect(saved).toMatchObject({ date: new Date("2026-02-03"), name: "Updated dose", type: "RABIES" });
      expect(saved.concurrencyToken).not.toBe(treatment.concurrencyToken);
      const events = await transaction.catAuditEvent.findMany({ where: { catId: cat.id }, orderBy: { occurredAt: "asc" } });
      expect(events).toEqual(expect.arrayContaining([
        expect.objectContaining({ eventType: "preventive_treatment_date_changed", oldValue: "2026-01-01", newValue: "2026-02-03", actorUserId: actor.id }),
        expect.objectContaining({ eventType: "preventive_treatment_name_changed", oldValue: "Old dose", newValue: "Updated dose", actorUserId: actor.id }),
        expect.objectContaining({ eventType: "preventive_treatment_type_changed", oldValue: "OTHER", newValue: "RABIES", actorUserId: actor.id }),
      ]));
    });
  });

  it("updates without creating audit events when no tracked values change", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await transaction.user.create({ data: { email: `unchanged-${Date.now()}@example.com` } });
      const cat = await transaction.cat.create({ data: { name: `Unchanged cat ${Date.now()}` } });
      const treatment = await transaction.catPreventiveTreatment.create({
        data: { catId: cat.id, date: new Date("2026-01-01"), name: "Same dose", type: "FIRST_VACCINE" },
      });
      const handler = new UpdateCatPreventiveTreatmentHandler(transaction as PrismaService);

      await handler.handle(treatment.id, { name: "Same dose", type: "FIRST_VACCINE" }, actor.id, false);

      await expect(transaction.catAuditEvent.count({ where: { catId: cat.id } })).resolves.toBe(0);
    });
  });

  it("rejects an other-partition treatment", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await transaction.user.create({ data: { email: `partition-${Date.now()}@example.com` } });
      const testCat = await transaction.cat.create({ data: { name: `Test cat ${Date.now()}`, isTest: true } });
      const treatment = await transaction.catPreventiveTreatment.create({
        data: { catId: testCat.id, date: new Date(), name: "Other partition" },
      });
      const handler = new UpdateCatPreventiveTreatmentHandler(transaction as PrismaService);

      await expect(handler.handle(treatment.id, { type: "RABIES" }, actor.id, false)).rejects.toThrow(NotFoundException);
    });
  });

  it("rejects a soft-deleted treatment", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await transaction.user.create({ data: { email: `deleted-${Date.now()}@example.com` } });
      const cat = await transaction.cat.create({ data: { name: `Deleted cat ${Date.now()}` } });
      const treatment = await transaction.catPreventiveTreatment.create({
        data: { catId: cat.id, date: new Date(), name: "Deleted", deletedAt: new Date() },
      });
      const handler = new UpdateCatPreventiveTreatmentHandler(transaction as PrismaService);

      await expect(handler.handle(treatment.id, { type: "RABIES" }, actor.id, false)).rejects.toThrow(NotFoundException);
    });
  });
});
