import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { DeleteCatWeightHandler } from "./delete-cat-weight.handler";

describe("DeleteCatWeightHandler", () => {
  it("soft-deletes and versions the weight and writes a value-free audit event", async () => {
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
      const weight = await tx.catWeight.create({
        data: { catId: cat.id, weightKg: 4, measuredAt: new Date() },
      });
      await new DeleteCatWeightHandler(tx as PrismaService).handle(
        cat.id,
        weight.id,
        actor.id,
        false,
      );
      await expect(
        tx.catWeight.findUnique({ where: { id: weight.id } }),
      ).resolves.toMatchObject({
        deletedAt: expect.any(Date),
        version: 1,
      });
      await expect(
        tx.auditEvent.findFirstOrThrow({ where: { catId: cat.id } }),
      ).resolves.toMatchObject({
        eventType: "weight_deleted",
        oldValue: null,
        newValue: null,
      });
    });
  });

  it("rejects a missing weight entry", async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await tx.cat.create({
        data: {
          name: `Cat ${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      });
      await expect(
        new DeleteCatWeightHandler(tx as PrismaService).handle(
          cat.id,
          "missing",
          undefined,
          false,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
