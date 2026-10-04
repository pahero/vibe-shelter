import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { ListCatTagsHandler } from "./list-cat-tags.handler";

describe("ListCatTagsHandler", () => {
  it("returns active tags in deterministic name order", async () => {
    await runInTestTransaction(async (tx) => {
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random()}`;
      const second = await tx.catTag.create({ data: { name: `${suffix} B` } });
      const first = await tx.catTag.create({ data: { name: `${suffix} A` } });
      await tx.catTag.create({
        data: { name: `${suffix} deleted`, deletedAt: new Date() },
      });
      const result = await new ListCatTagsHandler(tx as PrismaService).handle();
      expect(
        result
          .filter((tag) => tag.id === first.id || tag.id === second.id)
          .map((tag) => tag.id),
      ).toEqual([first.id, second.id]);
      expect(result.map((tag) => tag.name)).not.toContain(`${suffix} deleted`);
    });
  });

  it("only lists active tags from the requested test partition", async () => {
    await runInTestTransaction(async (tx) => {
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const testTag = await tx.catTag.create({
        data: { name: `${suffix} test`, isTest: true },
      });
      const regularTag = await tx.catTag.create({
        data: { name: `${suffix} regular`, isTest: false },
      });

      const testTags = await new ListCatTagsHandler(tx as PrismaService).handle(true);
      const regularTags = await new ListCatTagsHandler(tx as PrismaService).handle(false);

      expect(testTags.map((tag) => tag.id)).toContain(testTag.id);
      expect(testTags.map((tag) => tag.id)).not.toContain(regularTag.id);
      expect(regularTags.map((tag) => tag.id)).toContain(regularTag.id);
      expect(regularTags.map((tag) => tag.id)).not.toContain(testTag.id);
    });
  });
});
