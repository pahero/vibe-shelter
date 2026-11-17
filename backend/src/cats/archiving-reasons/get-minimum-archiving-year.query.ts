import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class GetMinimumArchivingYearQuery {
  constructor(private readonly prisma: PrismaService) {}

  async execute(isTest: boolean): Promise<number | null> {
    const result = await this.prisma.cat.aggregate({
      where: { isTest, deletedAt: null, archivedAt: { not: null } },
      _min: { archivedAt: true },
    });
    const date = result._min.archivedAt;
    return date ? date.getUTCFullYear() : null;
  }
}
