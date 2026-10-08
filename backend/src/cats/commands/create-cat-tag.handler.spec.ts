import { BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { CreateCatTagHandler } from "./create-cat-tag.handler";

describe("CreateCatTagHandler", () => {
  it("creates a normalized tag and value-free audit row", async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({
        data: {
          email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`,
        },
      });
      const result = await new CreateCatTagHandler(tx as PrismaService).handle(
        { name: "  Foster  ", color: "#8ecaff" },
        actor.id,
      );
      expect(result).toMatchObject({ name: "Foster", color: "#8ecaff" });
      await expect(
        tx.auditEvent.findFirstOrThrow({ where: { tagId: result.id } }),
      ).resolves.toMatchObject({
        action: "create",
        oldValue: null,
        newValue: null,
      });
    });
  });

  it("reuses an existing active tag of the same name", async () => {
    await runInTestTransaction(async (tx) => {
      const tag = await tx.catTag.create({ data: { name: "Existing" } });
      const result = await new CreateCatTagHandler(tx as PrismaService).handle({
        name: " Existing ",
      });
      expect(result.id).toBe(tag.id);
    });
  });

  it("keeps active tag names unique within each partition", async () => {
    await runInTestTransaction(async (tx) => {
      const handler = new CreateCatTagHandler(tx as PrismaService);
      const testTag = await handler.handle({ name: "Partitioned" }, undefined, true);
      const regularTag = await handler.handle({ name: "Partitioned" }, undefined, false);
      const reusedTestTag = await handler.handle({ name: "Partitioned" }, undefined, true);

      expect(testTag.id).not.toBe(regularTag.id);
      expect(reusedTestTag.id).toBe(testTag.id);
      await expect(
        tx.catTag.findUniqueOrThrow({ where: { id: testTag.id } }),
      ).resolves.toMatchObject({ isTest: true });
      await expect(
        tx.catTag.findUniqueOrThrow({ where: { id: regularTag.id } }),
      ).resolves.toMatchObject({ isTest: false });
    });
  });

  it("restores a soft-deleted tag with the same name in its partition", async () => {
    await runInTestTransaction(async (tx) => {
      const tag = await tx.catTag.create({
        data: { name: "Reusable", deletedAt: new Date() },
      });
      const actor = await tx.user.create({ data: { email: `${Date.now()}-restore-tag@example.com` } });
      const result = await new CreateCatTagHandler(tx as PrismaService).handle(
        { name: tag.name, color: "#8ecaff" },
        actor.id,
      );
      expect(result.id).toBe(tag.id);
      expect(result.color).toBe("#8ecaff");
      await expect(tx.catTag.findUniqueOrThrow({ where: { id: tag.id } })).resolves.toMatchObject({ deletedAt: null, version: 1 });
      await expect(tx.auditEvent.findFirstOrThrow({ where: { tagId: tag.id } })).resolves.toMatchObject({ action: "restore", actorUserId: actor.id, oldValue: null, newValue: null });
    });
  });

  it("rejects a blank tag name", async () => {
    await runInTestTransaction(async (tx) => {
      await expect(
        new CreateCatTagHandler(tx as PrismaService).handle({ name: " " }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it("rejects a disallowed tag color", async () => {
    await runInTestTransaction(async (tx) => {
      await expect(
        new CreateCatTagHandler(tx as PrismaService).handle({
          name: "Tag",
          color: "#123456",
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
