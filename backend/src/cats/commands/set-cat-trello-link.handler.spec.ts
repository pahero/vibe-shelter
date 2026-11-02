import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { SetCatTrelloLinkHandler } from "./set-cat-trello-link.handler";

describe("SetCatTrelloLinkHandler", () => {
  it("sets and clears a link without creating audit events", async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await tx.cat.create({
        data: {
          currentLocation: { create: { name: "Trello location" } },
          name: `Trello ${crypto.randomUUID()}`,
        },
      });
      const handler = new SetCatTrelloLinkHandler(tx as PrismaService);
      await expect(
        handler.handle(cat.id, "https://trello.com/c/wqNVNDIs", false),
      ).resolves.toEqual({ id: cat.id });
      await expect(
        tx.cat.findUniqueOrThrow({ where: { id: cat.id } }),
      ).resolves.toMatchObject({ trelloUrl: "https://trello.com/c/wqNVNDIs" });
      await handler.handle(cat.id, null, false);
      await expect(
        tx.cat.findUniqueOrThrow({ where: { id: cat.id } }),
      ).resolves.toMatchObject({ trelloUrl: null });
      await expect(
        tx.auditEvent.count({ where: { catId: cat.id } }),
      ).resolves.toBe(0);
    });
  });

  it("does not mutate cats outside the user's partition", async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await tx.cat.create({
        data: {
          currentLocation: { create: { name: "Test Trello", isTest: true } },
          name: `Test ${crypto.randomUUID()}`,
          isTest: true,
        },
      });
      await expect(
        new SetCatTrelloLinkHandler(tx as PrismaService).handle(
          cat.id,
          null,
          false,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
