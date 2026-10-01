import { BadRequestException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { CreateLocationHandler } from "./create-location.handler";

describe("CreateLocationHandler", () => {
  it("normalizes and creates a test location and value-free creation audit", async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({
        data: {
          email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`,
        },
      });
      const handler = new CreateLocationHandler(tx as PrismaService);
      const result = await handler.handle(
        "  Foster home  ",
        "  description  ",
        undefined,
        true,
        actor.id,
      );
      expect(result.id).toBeTruthy();
      expect(
        await tx.location.findUniqueOrThrow({ where: { id: result.id } }),
      ).toMatchObject({
        name: "Foster home",
        description: "description",
        isTest: true,
        status: "ACTIVE",
      });
      await expect(
        tx.locationAuditEvent.findFirstOrThrow({
          where: { locationId: result.id },
        }),
      ).resolves.toMatchObject({
        action: "create",
        oldValue: null,
        newValue: null,
        actorUserId: actor.id,
      });
    });
  });

  it("requires a nonblank name", async () => {
    await runInTestTransaction(async (tx) => {
      await expect(
        new CreateLocationHandler(tx as PrismaService).handle(
          "  ",
          undefined,
          undefined,
          false,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it("requires an existing optional owner", async () => {
    await runInTestTransaction(async (tx) => {
      await expect(
        new CreateLocationHandler(tx as PrismaService).handle(
          "Valid",
          undefined,
          "missing-owner",
          false,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it("advances the owner concurrency token when creating a location that references it", async () => {
    await runInTestTransaction(async (tx) => {
      const owner = await tx.user.create({
        data: {
          email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`,
        },
      });
      await new CreateLocationHandler(tx as PrismaService).handle(
        `Owned ${Date.now()}-${Math.random().toString(36).slice(2)}`,
        undefined,
        owner.id,
        false,
      );
      await expect(
        tx.user.findUniqueOrThrow({ where: { id: owner.id } }),
      ).resolves.toMatchObject({ version: 1 });
    });
  });

  it("rejects duplicate active names", async () => {
    await runInTestTransaction(async (tx) => {
      const name = `Location ${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await tx.location.create({ data: { name } });
      await expect(
        new CreateLocationHandler(tx as PrismaService).handle(
          name,
          undefined,
          undefined,
          false,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  it("allows reusing a deleted name", async () => {
    await runInTestTransaction(async (tx) => {
      const name = `Location ${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await tx.location.updateMany({
        where: { name },
        data: { deletedAt: new Date() },
      });
      await expect(
        new CreateLocationHandler(tx as PrismaService).handle(
          name,
          undefined,
          undefined,
          false,
        ),
      ).resolves.toMatchObject({ id: expect.any(String) });
    });
  });
});
