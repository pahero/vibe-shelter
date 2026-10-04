import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { toCatTag } from "../cats.mappers";

@Injectable()
export class ListCatTagsHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(isTest = false) {
    const tags = await this.prisma.catTag.findMany({
      where: { deletedAt: null, isTest },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    return tags.map(toCatTag);
  }
}
