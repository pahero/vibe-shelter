import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";
import { CreateCatTagCommand } from "../dto/create-cat-tag.dto";
import { CatTag } from "../cats.types";
import { toCatTag } from "../cats.mappers";
import { validateTagColor, validateTagName } from "../cats.handler-utils";

@Injectable()
export class CreateCatTagHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(
    data: CreateCatTagCommand,
    actorUserId?: string,
  ): Promise<CatTag> {
    const name = validateTagName(data.name);
    const color = validateTagColor(data.color);
    return runInNewTransaction(this.prisma, async (tx) => {
      const existing = await tx.catTag.findFirst({
        where: { name, deletedAt: null },
      });
      if (existing) return toCatTag(existing);
      const tag = await tx.catTag.create({ data: { name, color } });
      if (actorUserId)
        await tx.tagAuditEvent.create({
          data: { tagId: tag.id, actorUserId, action: "create" },
        });
      return toCatTag(tag);
    });
  }
}
