import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";
import { UpdateUserCommand } from "../../auth/dto";

@Injectable()
export class UpdateUserHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(id: string, data: UpdateUserCommand): Promise<{ id: string }> {
    if (
      data.role !== undefined &&
      data.role !== "admin" &&
      data.role !== "staff"
    )
      throw new BadRequestException("Invalid user role");
    if (
      data.status !== undefined &&
      data.status !== "active" &&
      data.status !== "inactive"
    )
      throw new BadRequestException("Invalid user status");
    const passwordHash = data.password
      ? await bcrypt.hash(data.password, 10)
      : undefined;
    return runInNewTransaction(this.prisma, async (tx) => {
      const existing = await tx.user.findFirst({
        where: { id, deletedAt: null },
        select: { id: true },
      });
      if (!existing) throw new NotFoundException("User not found");
      await tx.user.update({
        where: { id },
        data: {
          ...(data.fullName !== undefined
            ? { fullName: data.fullName.trim() || null }
            : {}),
          ...(data.role !== undefined
            ? { role: data.role.toUpperCase() as "ADMIN" | "STAFF" }
            : {}),
          ...(data.status !== undefined
            ? { status: data.status.toUpperCase() as "ACTIVE" | "INACTIVE" }
            : {}),
          ...(passwordHash
            ? { passwordHash, passwordChangeRequired: true }
            : {}),
          version: { increment: 1 },
        },
      });
      return { id };
    });
  }
}
