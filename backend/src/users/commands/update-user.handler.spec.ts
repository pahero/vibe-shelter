import { NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { UpdateUserHandler } from "./update-user.handler";

describe("UpdateUserHandler", () => {
  const owner = { id: "owner-actor", role: "OWNER" as const };
  it("updates provided fields and requires a password change after password replacement", async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`,
          passwordHash: await bcrypt.hash("old-password", 10),
        },
      });
      const result = await new UpdateUserHandler(tx as PrismaService).handle(
        user.id,
        {
          fullName: " New Name ",
          role: "admin",
          status: "inactive",
          password: "NewPassword123!",
          isTest: true,
        },
        owner,
      );
      expect(result).toEqual({ id: user.id });
      const updated = await tx.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(updated).toMatchObject({
        fullName: "New Name",
        role: "ADMIN",
        status: "INACTIVE",
        isTest: true,
        passwordChangeRequired: true,
        version: 1,
      });
      expect(
        await bcrypt.compare("NewPassword123!", updated.passwordHash!),
      ).toBe(true);
    });
  });

  it("rejects a missing user", async () => {
    await runInTestTransaction(async (tx) => {
      await expect(
        new UpdateUserHandler(tx as PrismaService).handle("missing", {}, owner),
      ).rejects.toThrow(NotFoundException);
    });
  });

  it("rejects a soft-deleted user", async () => {
    await runInTestTransaction(async (tx) => {
      const deleted = await tx.user.create({
        data: {
          email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`,
          deletedAt: new Date(),
        },
      });
      await expect(
        new UpdateUserHandler(tx as PrismaService).handle(deleted.id, {}, owner),
      ).rejects.toThrow(NotFoundException);
    });
  });

  it("rejects an invalid role", async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`,
        },
      });
      const data = { role: "root" };
      await expect(
        new UpdateUserHandler(tx as PrismaService).handle(
          user.id,
          data as Parameters<UpdateUserHandler["handle"]>[1],
          owner,
        ),
      ).rejects.toThrow("Invalid user role");
    });
  });

  it("rejects an invalid status", async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`,
        },
      });
      const data = { status: "deleted" };
      await expect(
        new UpdateUserHandler(tx as PrismaService).handle(
          user.id,
          data as Parameters<UpdateUserHandler["handle"]>[1],
          owner,
        ),
      ).rejects.toThrow("Invalid user status");
    });
  });

  it("prevents an Admin from promoting a user to Owner", async () => {
    await runInTestTransaction(async (tx) => {
      const target = await tx.user.create({ data: { email: `${crypto.randomUUID()}@example.com` } });
      await expect(new UpdateUserHandler(tx as PrismaService).handle(target.id, { role: "owner" }, { id: "admin-actor", role: "ADMIN" })).rejects.toThrow("Only Owners can change Owner roles");
    });
  });

  it("prevents an Admin from changing an Owner's role", async () => {
    await runInTestTransaction(async (tx) => {
      const target = await tx.user.create({ data: { email: `${crypto.randomUUID()}@example.com`, role: "OWNER" } });
      await expect(new UpdateUserHandler(tx as PrismaService).handle(target.id, { role: "staff" }, { id: "admin-actor", role: "ADMIN" })).rejects.toThrow("Only Owners can change Owner roles");
    });
  });

  it("prevents users from changing their own role", async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({ data: { email: `${crypto.randomUUID()}@example.com`, role: "OWNER" } });
      await expect(new UpdateUserHandler(tx as PrismaService).handle(actor.id, { role: "staff" }, { id: actor.id, role: "OWNER" })).rejects.toThrow("You cannot change your own role");
    });
  });
});
