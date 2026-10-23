import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";
import { createRefreshToken, hashRefreshToken } from "../refresh-token";

@Injectable()
export class RotateRefreshTokenHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(token: string) {
    const nextToken = createRefreshToken();
    const nextTokenHash = hashRefreshToken(nextToken);
    const user = await runInNewTransaction(this.prisma, async (tx) => {
      const stored = await tx.refreshToken.findUnique({
        where: { tokenHash: hashRefreshToken(token) },
        include: { user: true },
      });
      if (!stored || stored.consumedAt || stored.expiresAt <= new Date() || stored.user.status !== "ACTIVE" || stored.user.deletedAt) {
        throw new UnauthorizedException("Invalid refresh token");
      }
      const consumed = await tx.refreshToken.updateMany({
        where: { id: stored.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      if (consumed.count !== 1) throw new UnauthorizedException("Invalid refresh token");
      await tx.refreshToken.create({
        data: {
          userId: stored.userId,
          tokenHash: nextTokenHash,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      return stored.user;
    });
    return { refreshToken: nextToken, user };
  }
}
