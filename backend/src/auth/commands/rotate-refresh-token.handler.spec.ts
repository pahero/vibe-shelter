import { UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { randomUUID } from "node:crypto";
import { hashRefreshToken } from "../refresh-token";
import { CreateRefreshTokenHandler } from "./create-refresh-token.handler";
import { RotateRefreshTokenHandler } from "./rotate-refresh-token.handler";

describe("RotateRefreshTokenHandler", () => {
  it("consumes a refresh token once and stores a replacement hash", async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({ data: { email: `${randomUUID()}@example.com` } });
      const create = new CreateRefreshTokenHandler(tx as PrismaService);
      const original = await create.handle(user.id);
      const replacement = await new RotateRefreshTokenHandler(tx as PrismaService).handle(original);
      expect(replacement.user.id).toBe(user.id);
      expect(replacement.refreshToken).not.toBe(original);
      await expect(tx.refreshToken.count({ where: { userId: user.id, consumedAt: null } })).resolves.toBe(1);
    });
  });

  it("rejects unknown and expired tokens", async () => {
    await runInTestTransaction(async (tx) => {
      await expect(new RotateRefreshTokenHandler(tx as PrismaService).handle("not-a-real-refresh-token-which-is-long-enough")).rejects.toThrow(UnauthorizedException);
    });
  });

  it("rejects expired tokens", async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({ data: { email: `${randomUUID()}@example.com` } });
      const expired = "expired-token-value-that-is-long-enough-for-test";
      await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: hashRefreshToken(expired),
          expiresAt: new Date(Date.now() - 1000),
        },
      });
      await expect(new RotateRefreshTokenHandler(tx as PrismaService).handle(expired)).rejects.toThrow(UnauthorizedException);
    });
  });

  it("rejects a reused token after rotation", async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({ data: { email: `${randomUUID()}@example.com` } });
      const original = "already-consumed-refresh-token-value";
      await tx.refreshToken.create({ data: { userId: user.id, tokenHash: hashRefreshToken(original), expiresAt: new Date(Date.now() + 60_000), consumedAt: new Date() } });
      await expect(new RotateRefreshTokenHandler(tx as PrismaService).handle(original)).rejects.toThrow(UnauthorizedException);
    });
  });
});
