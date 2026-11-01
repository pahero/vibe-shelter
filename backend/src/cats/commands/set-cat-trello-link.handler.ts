import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class SetCatTrelloLinkHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(id: string, trelloUrl: string | null, isTest: boolean): Promise<{ id: string }> {
    const cat = await this.prisma.cat.findFirst({ where: { id, isTest }, select: { id: true } });
    if (!cat) throw new NotFoundException("Cat not found");
    await this.prisma.cat.update({ where: { id }, data: { trelloUrl } });
    return { id };
  }
}
