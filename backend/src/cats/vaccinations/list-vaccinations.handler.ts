import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class ListVaccinationsHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(catId: string, isTest: boolean) {
    const cat = await this.prisma.cat.findFirst({
      where: { id: catId, isTest, deletedAt: null },
      select: { id: true },
    });
    if (!cat) throw new NotFoundException("Cat not found");
    const vaccinations = await this.prisma.vaccination.findMany({
      where: { catId, deletedAt: null },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    return vaccinations.map((vaccination) => ({
      id: vaccination.id,
      type: vaccination.type,
      date: vaccination.date.toISOString().slice(0, 10),
      nextDueDate: vaccination.nextDueDate?.toISOString().slice(0, 10) ?? null,
      vaccineName: vaccination.vaccineName,
      createdAt: vaccination.createdAt.toISOString(),
      updatedAt: vaccination.updatedAt.toISOString(),
    }));
  }
}
