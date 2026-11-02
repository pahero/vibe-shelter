import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class UpdateCurrentUserNameHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(userId: string, fullName: string): Promise<{ id: string }> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null, status: "ACTIVE" },
      select: { id: true },
    });
    if (!user) throw new NotFoundException("User not found");
    await this.prisma.user.update({
      where: { id: userId },
      data: { fullName, version: { increment: 1 } },
    });
    return { id: user.id };
  }
}
