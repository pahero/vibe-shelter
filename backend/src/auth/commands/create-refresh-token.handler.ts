import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";
import { createRefreshToken, hashRefreshToken } from "../refresh-token";

@Injectable()
export class CreateRefreshTokenHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(userId: string): Promise<string> {
    const token = createRefreshToken();
    await runInNewTransaction(this.prisma, async (tx) => {
      const user = await tx.user.findFirst({
        where: { id: userId, status: "ACTIVE", deletedAt: null },
        select: { id: true },
      });
      if (!user) throw new UnauthorizedException("User account is inactive");
      await tx.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
      await tx.refreshToken.create({
        data: {
          userId,
          tokenHash: hashRefreshToken(token),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    });
    return token;
  }
}
