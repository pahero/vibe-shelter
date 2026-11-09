import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";

@Injectable()
export class CreateLocationHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(
    name: string,
    description: string | undefined,
    ownerIds: string[] | undefined,
    isTest: boolean,
    actorUserId?: string,
  ): Promise<{ id: string }> {
    const normalizedName = name?.trim();
    if (!normalizedName)
      throw new BadRequestException("Location name is required");

    return runInNewTransaction(this.prisma, async (tx) => {
      const ids = [...new Set(ownerIds ?? [])];
      if (ids.length) {
        const updated = await tx.user.updateMany({
          where: { id: { in: ids }, deletedAt: null, status: "ACTIVE", isTest },
          data: { version: { increment: 1 } },
        });
        if (updated.count !== ids.length)
          throw new BadRequestException("One or more owners are unavailable");
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
          owners: { create: ids.map((userId) => ({ userId })) },
          isTest,
          status: "ACTIVE",
        },
      });
      if (actorUserId) {
        await tx.auditEvent.create({
          data: {
            locationId: location.id,
            actorUserId,
            isTest,
            action: "create",
            eventType: "location_action",
          },
        });
      }
      return { id: location.id };
    });
  }
}
