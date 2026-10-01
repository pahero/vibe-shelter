import { UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { ChangePasswordHandler } from "./change-password.handler";

describe("ChangePasswordHandler", () => {
  it("changes a verified password and clears the forced-change marker", async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`,
          passwordHash: await bcrypt.hash("CurrentPassword!", 10),
          passwordChangeRequired: true,
        },
      });
      await new ChangePasswordHandler(tx as PrismaService).handle(
        user.id,
        "CurrentPassword!",
        "NewPassword!",
      );
      const updated = await tx.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(updated).toMatchObject({
        passwordChangeRequired: false,
        version: 1,
      });
      expect(await bcrypt.compare("NewPassword!", updated.passwordHash!)).toBe(
        true,
      );
    });
  });

  it("rejects an incorrect current password", async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`,
          passwordHash: await bcrypt.hash("CurrentPassword!", 10),
        },
      });
      await expect(
        new ChangePasswordHandler(tx as PrismaService).handle(
          user.id,
          "WrongPassword!",
          "NewPassword!",
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  it("rejects a missing user", async () => {
    await runInTestTransaction(async (tx) => {
      await expect(
        new ChangePasswordHandler(tx as PrismaService).handle(
          "missing",
          "x",
          "y",
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  it("rejects accounts without a password hash", async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`,
        },
      });
      await expect(
        new ChangePasswordHandler(tx as PrismaService).handle(
          user.id,
          "x",
          "y",
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
