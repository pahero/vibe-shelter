import { ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { ArchiveLocationHandler } from "./archive-location.handler";

describe("ArchiveLocationHandler", () => {
  it("soft deletes, increments the token, and writes a value-free lifecycle audit event", async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({
        data: {
          email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`,
        },
      });
      const location = await tx.location.create({
        data: {
          name: `Archive ${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      });
      await new ArchiveLocationHandler(tx as PrismaService).handle(
        location.id,
        false,
        actor.id,
      );
      await expect(
        tx.location.findUniqueOrThrow({ where: { id: location.id } }),
      ).resolves.toMatchObject({ status: "ARCHIVED", version: 1 });
      await expect(
        tx.auditEvent.findFirstOrThrow({
          where: { locationId: location.id },
        }),
      ).resolves.toMatchObject({
        action: "delete",
        oldValue: null,
        newValue: null,
      });
    });
  });

  it("rejects a missing location", async () => {
    await runInTestTransaction(async (tx) => {
      await expect(
        new ArchiveLocationHandler(tx as PrismaService).handle(
          "missing",
          false,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  it("hides locations outside the current partition", async () => {
    await runInTestTransaction(async (tx) => {
      const hidden = await tx.location.create({
        data: {
          name: `Hidden ${Date.now()}-${Math.random().toString(36).slice(2)}`,
          isTest: true,
        },
      });
      await expect(
        new ArchiveLocationHandler(tx as PrismaService).handle(
          hidden.id,
          false,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  it("rejects locations assigned to cats without deleting the location", async () => {
    await runInTestTransaction(async (tx) => {
      const assigned = await tx.location.create({
        data: {
          name: `Assigned ${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      });
      await tx.cat.create({
        data: {
          name: `Cat ${Date.now()}-${Math.random().toString(36).slice(2)}`,
          currentLocationId: assigned.id,
        },
      });
      await expect(
        new ArchiveLocationHandler(tx as PrismaService).handle(
          assigned.id,
          false,
        ),
      ).rejects.toThrow(ConflictException);
      await expect(
        tx.location.findUniqueOrThrow({ where: { id: assigned.id } }),
      ).resolves.toMatchObject({ deletedAt: null, version: 0 });
    });
  });
});
