import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { hashRefreshToken } from "../refresh-token";

@Injectable()
export class RevokeRefreshTokenHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(token: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashRefreshToken(token), consumedAt: null },
      data: { consumedAt: new Date() },
    });
  }
}
