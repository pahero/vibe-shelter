import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { runInTestTransaction } from "../test-utils/test-db";

describe("Trello traces backfill migration", () => {
  it.each([["20261120130000_backfill_cat_traces", "gt5iYVuO", "N9H2Gjw5"]])(
    "%s updates only exact listed IDs and is idempotent",
    async (migration, firstId, lastId) => {
      const sql = await readFile(
        join(process.cwd(), `prisma/migrations/${migration}/migration.sql`),
        "utf8",
      );
      await runInTestTransaction(async (tx) => {
        const suffix = crypto.randomUUID();
        const location = await tx.location.create({ data: { name: suffix } });
        const urls = [
          `https://trello.com/c/${firstId}?test=${suffix}`,
          `https://TRELLO.com/C/${lastId}/card-name?test=${suffix}`,
          `https://trello.com/c/${firstId}extra?test=${suffix}`,
          `https://trello.com/c/${firstId.toLowerCase()}?test=${suffix}`,
          `https://example.com/c/${firstId}?test=${suffix}`,
        ];
        const cats = await Promise.all(
          urls.map((trelloUrl, index) =>
            tx.cat.create({
              data: {
                name: `${suffix}-${index}`,
                trelloUrl,
                currentLocationId: location.id,
              },
            }),
          ),
        );
        await tx.$executeRawUnsafe(sql);
        for (const [index, cat] of cats.entries()) {
          const actual = await tx.cat.findUniqueOrThrow({
            where: { id: cat.id },
          });
          expect(actual.traces).toBe(index < 2);
          expect(actual.version).toBe(
            index < 2 ? cat.version + 1 : cat.version,
          );
          if (index < 2)
            expect(actual.concurrencyToken).not.toBe(cat.concurrencyToken);
          else expect(actual.concurrencyToken).toBe(cat.concurrencyToken);
        }
        const first = await tx.cat.findUniqueOrThrow({
          where: { id: cats[0].id },
        });
        await tx.$executeRawUnsafe(sql);
        const repeated = await tx.cat.findUniqueOrThrow({
          where: { id: cats[0].id },
        });
        expect(repeated.version).toBe(first.version);
        expect(repeated.concurrencyToken).toBe(first.concurrencyToken);
      });
    },
  );
});
