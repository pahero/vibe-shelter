import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { GetMinimumArchivingYearQuery } from "./get-minimum-archiving-year.query";

describe("GetMinimumArchivingYearQuery", () => {
  it("returns the earliest year in the requested partition, excluding deleted cats", async () => {
    await runInTestTransaction(async (tx) => {
      const query = new GetMinimumArchivingYearQuery(tx as PrismaService);
      const prefix = `${Date.now()}-${Math.random()}`;
      await tx.cat.create({
        data: {
          name: `Older ${prefix}`,
          archivedAt: new Date("2018-06-15T00:00:00.000Z"),
          currentLocation: { create: { name: `Older location ${prefix}` } },
        },
      });
      await tx.cat.create({
        data: {
          name: `Newer ${prefix}`,
          archivedAt: new Date("2021-06-15T00:00:00.000Z"),
          isTest: true,
          currentLocation: { create: { name: `Newer location ${prefix}` } },
        },
      });
      await tx.cat.create({
        data: {
          name: `Deleted ${prefix}`,
          archivedAt: new Date("2010-06-15T00:00:00.000Z"),
          deletedAt: new Date(),
          currentLocation: { create: { name: `Deleted location ${prefix}` } },
        },
      });

      await expect(query.execute(false)).resolves.toBe(2018);
      await expect(query.execute(true)).resolves.toBe(2021);
    });
  });

  it("returns null when there are no archived cats", async () => {
    await runInTestTransaction(async (tx) => {
      const query = new GetMinimumArchivingYearQuery(tx as PrismaService);
      await expect(query.execute(false)).resolves.toBeNull();
    });
  });
});
