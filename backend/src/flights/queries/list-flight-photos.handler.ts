import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CatPhotoUrlService } from "../../cats/cat-photo-url.service";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class ListFlightPhotosHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly photoUrls: CatPhotoUrlService,
  ) {}

  async handle(flightId: string, isTest: boolean) {
    if (!flightId?.trim())
      throw new BadRequestException("Flight ID is required");
    const flight = await this.prisma.flight.findFirst({
      where: { id: flightId, isTest },
      select: { id: true },
    });
    if (!flight) throw new NotFoundException("Flight not found");
    const photos = await this.prisma.flightPhoto.findMany({
      where: { flightId, deletedAt: null },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    return Promise.all(
      photos.map(async (photo) => ({
        id: photo.id,
        flightId: photo.flightId,
        url: await this.photoUrls.getPhotoUrl(photo.previewKey ?? photo.key),
        fullUrl: await this.photoUrls.getPhotoUrl(photo.key),
        createdAt: photo.createdAt.toISOString(),
      })),
    );
  }
}
