import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class ListParasiteTreatmentsHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(catId: string, isTest: boolean) {
    const cat = await this.prisma.cat.findFirst({ where: { id: catId, isTest, deletedAt: null }, select: { id: true } });
    if (!cat) throw new NotFoundException("Cat not found");
    const treatments = await this.prisma.parasiteTreatment.findMany({ where: { catId, deletedAt: null }, orderBy: [{ date: "desc" }, { createdAt: "desc" }] });
    return treatments.map((treatment) => ({
      id: treatment.id,
      type: treatment.type,
      date: treatment.date.toISOString().slice(0, 10),
      nextDueDate: treatment.nextDueDate?.toISOString().slice(0, 10) ?? null,
      productName: treatment.productName,
      createdAt: treatment.createdAt.toISOString(),
      updatedAt: treatment.updatedAt.toISOString(),
    }));
  }
}
