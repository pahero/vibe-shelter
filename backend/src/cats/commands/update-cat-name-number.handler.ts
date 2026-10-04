import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";

@Injectable()
export class UpdateCatNameNumberHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(
    id: string,
    nameNumber: number,
    isTest: boolean,
    actorUserId: string,
  ): Promise<{ id: string }> {
    return runInNewTransaction(this.prisma, async (tx) => {
      const cat = await tx.cat.findFirst({
        where: { id, isTest },
        select: { id: true, name: true, nameNumber: true },
      });
      if (!cat) throw new NotFoundException("Cat not found");
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${isTest}:${cat.name}`}))`;
      const duplicate = await tx.cat.findFirst({
        where: { id: { not: id }, name: cat.name, nameNumber, isTest },
        select: { id: true },
      });
      if (duplicate)
        throw new ConflictException("This cat name number is already in use");
      if (cat.nameNumber !== nameNumber) {
        await tx.cat.update({ where: { id }, data: { nameNumber } });
        await tx.auditEvent.create({
          data: {
            catId: id,
            actorUserId,
            eventType: "name_number_changed",
            oldValue: String(cat.nameNumber),
            newValue: String(nameNumber),
          },
        });
      }
      return { id };
    });
  }
}
