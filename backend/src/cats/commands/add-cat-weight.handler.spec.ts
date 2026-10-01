import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { AddCatWeightHandler } from "./add-cat-weight.handler";

describe("AddCatWeightHandler", () => {
  it("creates a dated weight and emits a lifecycle audit event", async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({
        data: {
          email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`,
        },
      });
      const cat = await tx.cat.create({
        data: {
          name: `Cat ${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      });
      const result = await new AddCatWeightHandler(tx as PrismaService).handle(
        cat.id,
        { weightKg: 4.25, measuredAt: new Date("2026-07-30") },
        actor.id,
        false,
      );
      expect(result).toMatchObject({
        catId: cat.id,
        weightKg: 4.25,
        measuredAt: expect.stringContaining("2026-07-30"),
      });
      await expect(
        tx.catAuditEvent.findFirstOrThrow({ where: { catId: cat.id } }),
      ).resolves.toMatchObject({
        eventType: "weight_created",
        oldValue: null,
        newValue: null,
      });
    });
  });

  it("rejects nonpositive weights", async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await tx.cat.create({
        data: {
          name: `Cat ${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      });
      await expect(
        new AddCatWeightHandler(tx as PrismaService).handle(
          cat.id,
          { weightKg: 0, measuredAt: new Date("2026-07-30") },
          undefined,
          false,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it("rejects invalid measured dates", async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await tx.cat.create({
        data: {
          name: `Cat ${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      });
      await expect(
        new AddCatWeightHandler(tx as PrismaService).handle(
          cat.id,
          { weightKg: 1, measuredAt: new Date(Number.NaN) },
          undefined,
          false,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it("rejects cats outside the current partition", async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await tx.cat.create({
        data: {
          name: `Test ${Date.now()}-${Math.random().toString(36).slice(2)}`,
          isTest: true,
        },
      });
      await expect(
        new AddCatWeightHandler(tx as PrismaService).handle(
          cat.id,
          { weightKg: 1, measuredAt: new Date("2026-07-30") },
          undefined,
          false,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
