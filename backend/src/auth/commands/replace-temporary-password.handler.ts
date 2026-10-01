import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";

@Injectable()
export class ReplaceTemporaryPasswordHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(userId: string, newPassword: string): Promise<void> {
    await runInNewTransaction(this.prisma, async (tx) => {
      const user = await tx.user.findFirst({
        where: { id: userId, deletedAt: null },
        select: { id: true, passwordChangeRequired: true },
      });
      if (!user) throw new NotFoundException("User not found");
      if (!user.passwordChangeRequired)
        throw new BadRequestException(
          "A temporary password replacement is not required",
        );
      await tx.user.update({
        where: { id: userId },
        data: {
          passwordHash: await bcrypt.hash(newPassword, 10),
          passwordChangeRequired: false,
          version: { increment: 1 },
        },
      });
    });
  }
}
