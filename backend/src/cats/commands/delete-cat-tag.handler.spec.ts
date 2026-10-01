import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { DeleteCatTagHandler } from "./delete-cat-tag.handler";

describe("DeleteCatTagHandler", () => {
  it("soft-deletes and versions the tag, detaches cats, and records linked value-free history", async () => {
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
      const tag = await tx.catTag.create({
        data: {
          name: `Tag ${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      });
      await tx.catTagOnCat.create({ data: { catId: cat.id, tagId: tag.id } });
      await new DeleteCatTagHandler(tx as PrismaService).handle(
        tag.id,
        actor.id,
      );
      await expect(
        tx.catTag.findUniqueOrThrow({ where: { id: tag.id } }),
      ).resolves.toMatchObject({ deletedAt: expect.any(Date), version: 1 });
      await expect(
        tx.catTagOnCat.count({ where: { tagId: tag.id } }),
      ).resolves.toBe(0);
      await expect(
        tx.catAuditEvent.findFirstOrThrow({
          where: { catId: cat.id, tagId: tag.id },
        }),
      ).resolves.toMatchObject({
        eventType: "tag_removed_from_cat",
        oldValue: null,
        newValue: null,
      });
    });
  });

  it("rejects missing or already deleted tags", async () => {
    await runInTestTransaction(async (tx) => {
      await expect(
        new DeleteCatTagHandler(tx as PrismaService).handle("missing"),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
