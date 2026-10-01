import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { ReplaceTemporaryPasswordHandler } from "./replace-temporary-password.handler";

describe("ReplaceTemporaryPasswordHandler", () => {
  it("replaces a temporary password and clears the required marker", async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`,
          passwordChangeRequired: true,
        },
      });
      await new ReplaceTemporaryPasswordHandler(tx as PrismaService).handle(
        user.id,
        "NewPassword!",
      );
      await expect(
        tx.user.findUniqueOrThrow({ where: { id: user.id } }),
      ).resolves.toMatchObject({
        passwordChangeRequired: false,
        passwordHash: expect.any(String),
        version: 1,
      });
    });
  });

  it("rejects when no replacement is required", async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`,
          passwordChangeRequired: false,
        },
      });
      await expect(
        new ReplaceTemporaryPasswordHandler(tx as PrismaService).handle(
          user.id,
          "NewPassword!",
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it("rejects missing users", async () => {
    await runInTestTransaction(async (tx) => {
      await expect(
        new ReplaceTemporaryPasswordHandler(tx as PrismaService).handle(
          "missing",
          "NewPassword!",
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
