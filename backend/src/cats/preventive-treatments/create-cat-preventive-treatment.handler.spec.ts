import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { CreateCatPreventiveTreatmentHandler } from "./create-cat-preventive-treatment.handler";

describe("CreateCatPreventiveTreatmentHandler", () => {
  it("persists the full preventive treatment and writes a value-free creation event", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await transaction.user.create({
        data: { email: `preventive-${Date.now()}@example.test` },
      });
      const cat = await transaction.cat.create({
        data: { name: `Preventive ${Date.now()}` },
      });
      const handler = new CreateCatPreventiveTreatmentHandler(
        transaction as PrismaService,
      );
      const payload = {
        date: new Date("2026-09-15"),
        name: "Purevax",
        type: "FIRST_VACCINE" as const,
      };

      const result = await handler.handle(cat.id, payload, actor.id, false);

      expect(
        await transaction.catPreventiveTreatment.findUniqueOrThrow({
          where: { id: result.id },
        }),
      ).toMatchObject({
        catId: cat.id,
        date: payload.date,
        name: payload.name,
        type: payload.type,
        deletedAt: null,
      });
      expect(
        await transaction.catAuditEvent.findFirstOrThrow({
          where: { catId: cat.id },
        }),
      ).toMatchObject({
        actorUserId: actor.id,
        eventType: "preventive_treatment_created",
        oldValue: null,
        newValue: null,
      });
    });
  });

  it("rejects a missing cat", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await transaction.user.create({
        data: { email: `preventive-missing-${Date.now()}@example.test` },
      });
      const handler = new CreateCatPreventiveTreatmentHandler(
        transaction as PrismaService,
      );

      await expect(
        handler.handle(
          "missing-cat",
          {
            date: new Date("2026-09-15"),
            name: "Purevax",
            type: "FIRST_VACCINE",
          },
          actor.id,
          false,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  it("rejects a cat from another test partition", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await transaction.user.create({
        data: { email: `preventive-partition-${Date.now()}@example.test` },
      });
      const cat = await transaction.cat.create({
        data: { name: `Test cat ${Date.now()}`, isTest: true },
      });
      const handler = new CreateCatPreventiveTreatmentHandler(
        transaction as PrismaService,
      );

      await expect(
        handler.handle(
          cat.id,
          {
            date: new Date("2026-09-15"),
            name: "Purevax",
            type: "FIRST_VACCINE",
          },
          actor.id,
          false,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
