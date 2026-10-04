import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";

@Injectable()
export class CreateLocationHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(
    name: string,
    description: string | undefined,
    ownerId: string | undefined,
    isTest: boolean,
    actorUserId?: string,
  ): Promise<{ id: string }> {
    const normalizedName = name?.trim();
    if (!normalizedName)
      throw new BadRequestException("Location name is required");

    return runInNewTransaction(this.prisma, async (tx) => {
      if (ownerId) {
        const owner = await tx.user.findFirst({
          where: { id: ownerId, deletedAt: null },
          select: { id: true },
        });
        if (!owner)
          throw new BadRequestException("Specified owner user does not exist");
      }
      const duplicate = await tx.location.findFirst({
        where: { name: normalizedName, isTest, deletedAt: null },
        select: { id: true },
      });
      if (duplicate)
        throw new ConflictException("A location with this name already exists");

      const location = await tx.location.create({
        data: {
          name: normalizedName,
          description: description?.trim() || null,
          ownerId: ownerId || null,
          isTest,
          status: "ACTIVE",
        },
        include: {
          owner: { select: { id: true, email: true, fullName: true } },
        },
      });
      if (ownerId)
        await tx.user.update({
          where: { id: ownerId },
          data: { version: { increment: 1 } },
        });
      if (actorUserId) {
        await tx.auditEvent.create({
          data: { locationId: location.id, actorUserId, action: "create" },
        });
      }
      return { id: location.id };
    });
  }
}
