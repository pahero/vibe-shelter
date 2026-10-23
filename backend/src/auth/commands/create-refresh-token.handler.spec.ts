import { UnauthorizedException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { CreateRefreshTokenHandler } from "./create-refresh-token.handler";

describe("CreateRefreshTokenHandler", () => {
  it("stores only a hash and updates last login", async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({ data: { email: `${randomUUID()}@example.com` } });
      const token = await new CreateRefreshTokenHandler(tx as PrismaService).handle(user.id);
      const stored = await tx.refreshToken.findFirstOrThrow({ where: { userId: user.id } });
      expect(stored.tokenHash).not.toBe(token);
      expect(stored.tokenHash).toHaveLength(64);
      expect(stored.expiresAt.getTime()).toBeGreaterThan(Date.now());
      await expect(tx.user.findUniqueOrThrow({ where: { id: user.id } })).resolves.toMatchObject({ lastLoginAt: expect.any(Date) });
    });
  });

  it("rejects a missing account", async () => {
    await runInTestTransaction(async (tx) => {
      const handler = new CreateRefreshTokenHandler(tx as PrismaService);
      await expect(handler.handle("missing-user")).rejects.toThrow(UnauthorizedException);
    });
  });

  it("rejects an inactive account", async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({ data: { email: `${randomUUID()}@example.com`, status: "INACTIVE" } });
      const handler = new CreateRefreshTokenHandler(tx as PrismaService);
      await expect(handler.handle(user.id)).rejects.toThrow(UnauthorizedException);
    });
  });
});
