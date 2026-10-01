import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { toCatTag } from "../cats.mappers";

@Injectable()
export class ListCatTagsHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle() {
    const tags = await this.prisma.catTag.findMany({
      where: { deletedAt: null },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    return tags.map(toCatTag);
  }
}
