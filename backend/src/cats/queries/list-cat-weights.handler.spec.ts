import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { ListCatWeightsHandler } from "./list-cat-weights.handler";

describe("ListCatWeightsHandler", () => {
  it("returns the cat weights newest measured first", async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await tx.cat.create({
        data: {
          name: `Weight ${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      });
      const weight = await tx.catWeight.create({
        data: { catId: cat.id, weightKg: 3.2, measuredAt: new Date() },
      });
      const result = await new ListCatWeightsHandler(
        tx as PrismaService,
      ).handle(cat.id, false);
      expect(result[0]).toMatchObject({
        id: weight.id,
        weightKg: 3.2,
        catId: cat.id,
      });
    });
  });

  it("rejects cats outside the partition", async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await tx.cat.create({
        data: {
          name: `Test ${Date.now()}-${Math.random().toString(36).slice(2)}`,
          isTest: true,
        },
      });
      await expect(
        new ListCatWeightsHandler(tx as PrismaService).handle(cat.id, false),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
