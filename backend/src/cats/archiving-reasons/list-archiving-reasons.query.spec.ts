import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { ListArchivingReasonsQuery } from "./list-archiving-reasons.query";

describe("ListArchivingReasonsQuery", () => {
  it("returns active reasons ordered by name and hides soft-deleted reasons", async () => {
    await runInTestTransaction(async (tx) => {
      const query = new ListArchivingReasonsQuery(tx as PrismaService);
      const active = await tx.catArchivingReason.create({
        data: { name: `Active ${Date.now()}-${Math.random()}` },
      });
      const deleted = await tx.catArchivingReason.create({
        data: {
          name: `Deleted ${Date.now()}-${Math.random()}`,
          deletedAt: new Date(),
        },
      });
      const testOnly = await tx.catArchivingReason.create({
        data: {
          name: `Test-only ${Date.now()}-${Math.random()}`,
          isTest: true,
        },
      });

      const reasons = await query.execute(false);
      expect(reasons).toEqual(
        expect.arrayContaining([{ id: active.id, name: active.name }]),
      );
      expect(reasons).not.toEqual(
        expect.arrayContaining([{ id: deleted.id, name: deleted.name }]),
      );
      expect(reasons).not.toEqual(
        expect.arrayContaining([{ id: testOnly.id, name: testOnly.name }]),
      );
      const testReasons = await query.execute(true);
      expect(testReasons).toEqual(
        expect.arrayContaining([{ id: testOnly.id, name: testOnly.name }]),
      );
      expect(testReasons).not.toEqual(
        expect.arrayContaining([{ id: active.id, name: active.name }]),
      );
    });
  });
});
