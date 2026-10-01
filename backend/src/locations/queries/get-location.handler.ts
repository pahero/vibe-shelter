import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class GetLocationHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(id: string, isTest: boolean) {
    if (!id?.trim()) throw new BadRequestException("Location ID is required");
    const location = await this.prisma.location.findFirst({
      where: { id, isTest, deletedAt: null },
      include: { owner: { select: { id: true, email: true, fullName: true } } },
    });
    if (!location) throw new NotFoundException("Location not found");
    return location;
  }
}
