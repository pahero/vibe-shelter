import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";
import { UpdateUserCommand } from "../../auth/dto";
import { ForbiddenException } from "@nestjs/common";

@Injectable()
export class UpdateUserHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(id: string, data: UpdateUserCommand, actor: { id: string; role: "OWNER" | "ADMIN" | "STAFF" }): Promise<{ id: string }> {
    if (
      data.role !== undefined &&
      data.role !== "admin" &&
      data.role !== "staff" &&
      data.role !== "owner"
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
        select: { id: true, role: true },
      });
      if (!existing) throw new NotFoundException("User not found");
      if (data.role !== undefined && actor.id === id)
        throw new ForbiddenException("You cannot change your own role");
      if (data.role !== undefined && actor.role === "ADMIN" &&
          (existing.role === "OWNER" || data.role === "owner"))
        throw new ForbiddenException("Only Owners can change Owner roles");
      if (data.role !== undefined && actor.role !== "OWNER" && actor.role !== "ADMIN")
        throw new ForbiddenException("Only Owners and Admins can change user roles");
      await tx.user.update({
        where: { id },
        data: {
          ...(data.fullName !== undefined
            ? { fullName: data.fullName.trim() || null }
            : {}),
          ...(data.role !== undefined
            ? { role: data.role.toUpperCase() as "OWNER" | "ADMIN" | "STAFF" }
            : {}),
          ...(data.status !== undefined
            ? { status: data.status.toUpperCase() as "ACTIVE" | "INACTIVE" }
            : {}),
          ...(passwordHash
            ? { passwordHash, passwordChangeRequired: true }
            : {}),
          ...(data.isTest !== undefined ? { isTest: data.isTest } : {}),
          version: { increment: 1 },
        },
      });
      return { id };
    });
  }
}
