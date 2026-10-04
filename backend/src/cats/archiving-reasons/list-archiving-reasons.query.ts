import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { ArchivingReasonDto } from "./archiving-reason.types";

@Injectable()
export class ListArchivingReasonsQuery {
  constructor(private readonly prisma: PrismaService) {}

  async execute(isTest: boolean): Promise<ArchivingReasonDto[]> {
    const reasons = await this.prisma.catArchivingReason.findMany({
      where: { deletedAt: null, isTest },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    return reasons.map((reason) => ({ id: reason.id, name: reason.name }));
  }
}
