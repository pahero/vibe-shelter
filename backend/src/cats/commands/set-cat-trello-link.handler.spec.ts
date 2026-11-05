import { ConflictException, NotFoundException } from "@nestjs/common";
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

  it("rejects a Trello link already assigned to another cat with its identity", async () => {
    await runInTestTransaction(async (tx) => {
      const existing = await tx.cat.create({
        data: {
          name: "Existing Trello cat",
          currentLocation: { create: { name: "Existing link location" } },
          trelloUrl: "https://trello.com/c/wqNVNDIs/existing-slug",
        },
      });
      const target = await tx.cat.create({
        data: {
          name: "Target Trello cat",
          currentLocation: { create: { name: "Target link location" } },
        },
      });

      await expect(
        new SetCatTrelloLinkHandler(tx as PrismaService).handle(
          target.id,
          "https://trello.com/c/wqNVNDIs",
          false,
        ),
      ).rejects.toMatchObject({
        constructor: ConflictException,
        response: {
          duplicateCat: {
            id: existing.id,
            name: "Existing Trello cat",
          },
        },
      });
      await expect(
        tx.cat.findUniqueOrThrow({ where: { id: target.id } }),
      ).resolves.toMatchObject({ trelloUrl: null });
    });
  });

  it("enforces Trello link uniqueness in PostgreSQL", async () => {
    await runInTestTransaction(async (tx) => {
      const trelloUrl = "https://trello.com/c/uniqueTrelloCard";
      await tx.cat.create({
        data: {
          name: "First unique-link cat",
          trelloUrl,
          currentLocation: { create: { name: "First unique-link location" } },
        },
      });

      await expect(
        tx.cat.create({
          data: {
            name: "Second unique-link cat",
            trelloUrl,
            currentLocation: {
              create: { name: "Second unique-link location" },
            },
          },
        }),
      ).rejects.toMatchObject({ code: "P2002" });
    });
  });
});
