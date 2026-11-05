import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { trelloCardShortId } from "../trello-card-link";

@Injectable()
export class SetCatTrelloLinkHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(
    id: string,
    trelloUrl: string | null,
    isTest: boolean,
  ): Promise<{ id: string }> {
    const requestedShortId = trelloUrl ? trelloCardShortId(trelloUrl) : null;
    const cat = await this.prisma.cat.findFirst({
      where: { id, isTest },
      select: { id: true },
    });
    if (!cat) throw new NotFoundException("Cat not found");
    if (requestedShortId) {
      const potentialDuplicates = await this.prisma.cat.findMany({
        where: {
          id: { not: id },
          trelloUrl: { startsWith: `https://trello.com/c/${requestedShortId}` },
        },
        select: { id: true, name: true, nameNumber: true, trelloUrl: true },
      });
      const duplicate = potentialDuplicates.find(
        (candidate) =>
          candidate.trelloUrl !== null &&
          trelloCardShortId(candidate.trelloUrl) === requestedShortId,
      );
      if (duplicate) {
        throw new ConflictException({
          message: `This Trello card is already linked to another cat. [duplicateCatId=${duplicate.id}]`,
          duplicateCat: {
            id: duplicate.id,
            name: duplicate.name,
            nameNumber: duplicate.nameNumber,
          },
        });
      }
    }
    await this.prisma.cat.update({ where: { id }, data: { trelloUrl } });
    return { id };
  }
}
