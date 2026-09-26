import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

export type CatTreatmentResponse = {
  id: string; shortName: string; instructions: string; startDate: string; endDate: string | null;
  dosesPerDay: number; createdAt: string; updatedAt: string;
  administrations: { date: string; doseNumber: number; checkedBy: { id: string; fullName: string | null } }[];
};

@Injectable()
export class ListCatTreatmentsHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(catId: string, isTest: boolean): Promise<CatTreatmentResponse[]> {
    const cat = await this.prisma.cat.findFirst({ where: { id: catId, isTest }, select: { id: true } });
    if (!cat) throw new NotFoundException("Cat not found");
    const treatments = await this.prisma.catTreatment.findMany({
      where: { catId }, orderBy: { createdAt: "asc" },
      include: { administrations: { orderBy: [{ administeredOn: "asc" }, { doseNumber: "asc" }], include: { checkedByUser: { select: { id: true, fullName: true } } } } },
    });
    return treatments.map((treatment) => ({
      id: treatment.id, shortName: treatment.shortName, instructions: treatment.instructions,
      startDate: treatment.startDate.toISOString().slice(0, 10), endDate: treatment.endDate?.toISOString().slice(0, 10) ?? null,
      dosesPerDay: treatment.dosesPerDay, createdAt: treatment.createdAt.toISOString(), updatedAt: treatment.updatedAt.toISOString(),
      administrations: treatment.administrations.map((administration) => ({ date: administration.administeredOn.toISOString().slice(0, 10), doseNumber: administration.doseNumber, checkedBy: administration.checkedByUser })),
    }));
  }
}
