import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class ListFavoriteCatsWithActiveTreatmentsHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(userId: string, isTest: boolean) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    return this.prisma.cat.findMany({
      where: {
        deletedAt: null,
        isTest,
        favorites: { some: { userId } },
        treatments: {
          some: {
            deletedAt: null,
            startDate: { lte: today },
            OR: [{ endDate: null }, { endDate: { gte: today } }],
          },
        },
      },
      select: { id: true, name: true, nameNumber: true, updatedAt: true },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    });
  }
}
