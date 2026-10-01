import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class ValidateSessionHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });
    if (!session) throw new UnauthorizedException("Session not found");
    if (session.revokedAt)
      throw new UnauthorizedException("Session has been revoked");
    if (new Date() > session.expiresAt)
      throw new UnauthorizedException("Session expired");
    if (session.user.status !== "ACTIVE" || session.user.deletedAt)
      throw new UnauthorizedException("User is inactive");
    return session;
  }
}
