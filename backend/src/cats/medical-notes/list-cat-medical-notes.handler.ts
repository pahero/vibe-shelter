import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
export type CatMedicalNoteResponse = { id: string; date: string; comment: string; createdAt: string; updatedAt: string };
@Injectable()
export class ListCatMedicalNotesHandler {
  constructor(private readonly prisma: PrismaService) {}
  async handle(catId: string, isTest: boolean): Promise<CatMedicalNoteResponse[]> {
    const cat = await this.prisma.cat.findFirst({ where: { id: catId, isTest }, select: { id: true } });
    if (!cat) throw new NotFoundException("Cat not found");
    const notes = await this.prisma.catMedicalNote.findMany({ where: { catId, deletedAt: null }, orderBy: [{ date: "desc" }, { createdAt: "desc" }] });
    return notes.map((note) => ({ id: note.id, date: note.date.toISOString().slice(0, 10), comment: note.comment, createdAt: note.createdAt.toISOString(), updatedAt: note.updatedAt.toISOString() }));
  }
}
