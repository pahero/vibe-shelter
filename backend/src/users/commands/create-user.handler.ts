import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";
import { CreateUserCommand } from "../../auth/dto";

@Injectable()
export class CreateUserHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(data: CreateUserCommand): Promise<{ id: string }> {
    if (!data.password?.trim())
      throw new BadRequestException("Password is required");
    if (typeof data.isTest !== "boolean")
      throw new BadRequestException("Test user marker is required");
    if (data.role !== "admin" && data.role !== "staff")
      throw new BadRequestException("Invalid user role");
    if (data.status !== "active" && data.status !== "inactive")
      throw new BadRequestException("Invalid user status");
    const email = data.email;
    const passwordHash = await bcrypt.hash(data.password, 10);
    return runInNewTransaction(this.prisma, async (tx) => {
      const existing = await tx.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existing) throw new ConflictException("User already exists");
      const user = await tx.user.create({
        data: {
          email,
          fullName: data.fullName?.trim() || null,
          role: data.role.toUpperCase() as "ADMIN" | "STAFF",
          status: data.status.toUpperCase() as "ACTIVE" | "INACTIVE",
          passwordHash,
          passwordChangeRequired: true,
          isTest: data.isTest,
        },
      });
      return { id: user.id };
    });
  }
}
