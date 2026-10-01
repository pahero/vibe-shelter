import { NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { UpdateUserHandler } from "./update-user.handler";

describe("UpdateUserHandler", () => {
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
        },
      );
      expect(result).toEqual({ id: user.id });
      const updated = await tx.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(updated).toMatchObject({
        fullName: "New Name",
        role: "ADMIN",
        status: "INACTIVE",
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
        new UpdateUserHandler(tx as PrismaService).handle("missing", {}),
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
        new UpdateUserHandler(tx as PrismaService).handle(deleted.id, {}),
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
      const data = { role: "owner" };
      await expect(
        new UpdateUserHandler(tx as PrismaService).handle(
          user.id,
          data as Parameters<UpdateUserHandler["handle"]>[1],
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
        ),
      ).rejects.toThrow("Invalid user status");
    });
  });
});
