import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";

@Injectable()
export class ToggleCatFavoriteHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(catId: string, userId: string): Promise<{ favorite: boolean }> {
    return runInNewTransaction(this.prisma, async (tx) => {
      const cat = await tx.cat.findFirst({ where: { id: catId, deletedAt: null }, select: { id: true } });
      if (!cat) throw new NotFoundException("Cat not found");
      const existing = await tx.catFavorite.findUnique({ where: { userId_catId: { userId, catId } } });
      if (existing) {
        await tx.catFavorite.delete({ where: { userId_catId: { userId, catId } } });
        return { favorite: false };
      }
      await tx.catFavorite.create({ data: { userId, catId } });
      return { favorite: true };
    });
  }
}
