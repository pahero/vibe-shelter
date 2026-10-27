import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { ToggleCatFavoriteHandler } from "./toggle-cat-favorite.handler";

describe("ToggleCatFavoriteHandler", () => {
  it("adds a favorite for the specified user", async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({ data: { email: `${crypto.randomUUID()}@example.com` } });
      const cat = await tx.cat.create({ data: { name: `Favorite ${crypto.randomUUID()}` } });
      await expect(new ToggleCatFavoriteHandler(tx as PrismaService).handle(cat.id, user.id)).resolves.toEqual({ favorite: true });
      await expect(tx.catFavorite.findUnique({ where: { userId_catId: { userId: user.id, catId: cat.id } } })).resolves.toMatchObject({ userId: user.id, catId: cat.id });
    });
  });

  it("removes only the current user's existing favorite", async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({ data: { email: `${crypto.randomUUID()}@example.com` } });
      const otherUser = await tx.user.create({ data: { email: `${crypto.randomUUID()}@example.com` } });
      const cat = await tx.cat.create({ data: { name: `Shared ${crypto.randomUUID()}` } });
      await tx.catFavorite.createMany({ data: [{ userId: user.id, catId: cat.id }, { userId: otherUser.id, catId: cat.id }] });
      await expect(new ToggleCatFavoriteHandler(tx as PrismaService).handle(cat.id, user.id)).resolves.toEqual({ favorite: false });
      await expect(tx.catFavorite.findUnique({ where: { userId_catId: { userId: otherUser.id, catId: cat.id } } })).resolves.not.toBeNull();
      await expect(tx.catFavorite.findUnique({ where: { userId_catId: { userId: user.id, catId: cat.id } } })).resolves.toBeNull();
    });
  });

  it("rejects a missing cat", async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({ data: { email: `${crypto.randomUUID()}@example.com` } });
      const handler = new ToggleCatFavoriteHandler(tx as PrismaService);
      await expect(handler.handle(`missing-${crypto.randomUUID()}`, user.id)).rejects.toThrow(NotFoundException);
    });
  });

  it("rejects a deleted cat", async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({ data: { email: `${crypto.randomUUID()}@example.com` } });
      const cat = await tx.cat.create({ data: { name: `Deleted ${crypto.randomUUID()}`, deletedAt: new Date() } });
      const handler = new ToggleCatFavoriteHandler(tx as PrismaService);
      await expect(handler.handle(cat.id, user.id)).rejects.toThrow(NotFoundException);
    });
  });
});
