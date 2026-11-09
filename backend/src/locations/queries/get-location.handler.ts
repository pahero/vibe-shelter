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
      include: {
        owners: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
                deletedAt: true,
                status: true,
              },
            },
          },
        },
      },
    });
    if (!location) throw new NotFoundException("Location not found");
    return { ...location, owners: location.owners.map(({ user }) => user) };
  }
}
