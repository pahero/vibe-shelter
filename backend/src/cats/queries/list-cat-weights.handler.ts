import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { toCatWeight } from "../cats.mappers";
import { validateCatId } from "../cats.handler-utils";

@Injectable()
export class ListCatWeightsHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(catId: string, isTest: boolean) {
    validateCatId(catId);
    const cat = await this.prisma.cat.findFirst({
      where: { id: catId, isTest },
      select: { id: true },
    });
    if (!cat) throw new NotFoundException("Cat not found");
    const weights = await this.prisma.catWeight.findMany({
      where: { catId, deletedAt: null },
      orderBy: [{ measuredAt: "desc" }, { createdAt: "desc" }],
    });
    return weights.map(toCatWeight);
  }
}
