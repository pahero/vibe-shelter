import { randomUUID } from "node:crypto";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { hashRefreshToken } from "../refresh-token";
import { RevokeRefreshTokenHandler } from "./revoke-refresh-token.handler";

describe("RevokeRefreshTokenHandler", () => {
  it("consumes a stored refresh token", async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({ data: { email: `${randomUUID()}@example.com` } });
      const token = "refresh-token-to-revoke-which-is-long-enough";
      const stored = await tx.refreshToken.create({ data: { userId: user.id, tokenHash: hashRefreshToken(token), expiresAt: new Date(Date.now() + 60_000) } });
      await new RevokeRefreshTokenHandler(tx as PrismaService).handle(token);
      await expect(tx.refreshToken.findUniqueOrThrow({ where: { id: stored.id } })).resolves.toMatchObject({ consumedAt: expect.any(Date) });
    });
  });

  it("ignores unknown tokens", async () => {
    await runInTestTransaction(async (tx) => {
      await expect(new RevokeRefreshTokenHandler(tx as PrismaService).handle("unknown-refresh-token" )).resolves.toBeUndefined();
    });
  });
});
