// src/locations/locations.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateLocationDto, UpdateLocationDto } from './dto';
import { Prisma } from '@prisma/client';

const VALID_LOCATION_STATUSES = ['ACTIVE', 'INACTIVE', 'ARCHIVED'];

export interface LocationFilters {
  ownerId?: string;
  status?: string;
  skip?: number;
  limit?: number;
}

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  async createLocation(data: CreateLocationDto, currentUserIsTest = false, actorUserId?: string) {
    // Validate name is not empty
    if (!data.name || data.name.trim().length === 0) {
      throw new BadRequestException('Location name is required');
    }

    // If owner is provided, validate it exists
    if (data.ownerId) {
      const user = await this.prisma.user.findUnique({
        where: { id: data.ownerId },
      });
      if (!user) {
        throw new BadRequestException('Specified owner user does not exist');
      }
    }

    try {
      const create = async (transaction: any) => {
        const location = await transaction.location.create({
          data: {
            name: data.name.trim(),
            description: data.description?.trim(),
            ownerId: data.ownerId || null,
            isTest: currentUserIsTest,
            status: 'ACTIVE',
          },
          include: {
            owner: true,
          },
        });
        if (actorUserId) {
          await transaction.locationAuditEvent.create({
            data: { locationId: location.id, actorUserId, action: 'create', oldValue: null, newValue: this.locationAuditValue(location) },
          });
        }
        return location;
      };
      const location = actorUserId ? await this.prisma.$transaction(create) : await create(this.prisma);
      return location;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          'A location with this name already exists',
        );
      }
      throw error;
    }
  }

  async findAll(filters: LocationFilters = {}, currentUserIsTest = false) {
    const { ownerId, status, skip = 0, limit = 50 } = filters;

    // Build where clause
    const where: any = { isTest: currentUserIsTest, deletedAt: null };
    if (ownerId) {
      where.ownerId = ownerId;
    }
    if (status) {
      if (!VALID_LOCATION_STATUSES.includes(status)) {
        throw new BadRequestException(
          `Invalid status filter. Must be one of: ${VALID_LOCATION_STATUSES.join(', ')}`,
        );
      }
      where.status = status;
    }

    const [data, total] = await Promise.all([
      (this.prisma as any).location.findMany({
        where,
        include: {
          owner: true,
        },
        orderBy: {
          name: 'asc',
        },
        skip: Math.max(0, skip),
        take: Math.min(100, limit),
      }),
      (this.prisma as any).location.count({ where }),
    ]);

    return {
      data,
      total,
      skip: Math.max(0, skip),
      limit: Math.min(100, limit),
    };
  }

  async findById(id: string, currentUserIsTest = false) {
    if (!id || id.trim().length === 0) {
      throw new BadRequestException('Location ID is required');
    }

    const location = await (this.prisma as any).location.findFirst({
      where: { id, isTest: currentUserIsTest, deletedAt: null },
      include: {
        owner: true,
      },
    });

    if (!location) {
      throw new NotFoundException(`Location not found`);
    }

    return location;
  }

  async findByOwnerId(ownerId: string, currentUserIsTest = false) {
    if (!ownerId || ownerId.trim().length === 0) {
      throw new BadRequestException('Owner ID is required');
    }

    return await (this.prisma as any).location.findMany({
      where: { ownerId, isTest: currentUserIsTest, deletedAt: null },
      include: {
        owner: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async updateLocation(id: string, data: UpdateLocationDto, currentUserIsTest = false, actorUserId?: string) {
    // Verify location exists
    const existingLocation = await this.findById(id, currentUserIsTest);

    // If updating name, check uniqueness (except current location)
    if (data.name) {
      const existing = await (this.prisma as any).location.findFirst({
        where: { name: data.name.trim(), deletedAt: null },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          'A location with this name already exists',
        );
      }
    }

    // Validate owner if provided
    if (data.ownerId) {
      const user = await this.prisma.user.findUnique({
        where: { id: data.ownerId },
      });
      if (!user) {
        throw new BadRequestException('Specified owner user does not exist');
      }
    }

    // Validate status if provided
    if (data.status && !VALID_LOCATION_STATUSES.includes(data.status)) {
      throw new BadRequestException(
        `Invalid status. Must be one of: ${VALID_LOCATION_STATUSES.join(', ')}`,
      );
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;
    if (data.ownerId !== undefined) updateData.ownerId = data.ownerId?.trim() || null;
    if (data.status !== undefined) updateData.status = data.status;

    const update = async (transaction: any) => {
      const location = await transaction.location.update({
        where: { id },
        data: updateData,
        include: {
          owner: true,
        },
      });
      if (actorUserId) {
        await transaction.locationAuditEvent.create({
          data: {
            locationId: id,
            actorUserId,
            action: 'update',
            oldValue: this.locationAuditValue(existingLocation),
            newValue: this.locationAuditValue(location),
          },
        });
      }
      return location;
    };
    const location = actorUserId ? await this.prisma.$transaction(update) : await update(this.prisma);
    return location;
  }

  async archiveLocation(id: string, currentUserIsTest = false, actorUserId?: string) {
    const existingLocation = await this.findById(id, currentUserIsTest);
    const assignedCats = await (this.prisma as any).cat.count({
      where: { currentLocationId: id, isTest: currentUserIsTest },
    });
    if (assignedCats > 0) {
      throw new ConflictException('Cannot remove a location that is assigned to cats. Move the cats to another location first.');
    }
    const archive = async (transaction: any) => {
      const location = await transaction.location.update({
        where: { id },
        data: { status: 'ARCHIVED', deletedAt: new Date() },
        include: {
          owner: true,
        },
      });
      if (actorUserId) {
        await transaction.locationAuditEvent.create({
          data: {
            locationId: id,
            actorUserId,
            action: 'delete',
            oldValue: this.locationAuditValue(existingLocation),
            newValue: null,
          },
        });
      }
      return location;
    };
    const location = actorUserId ? await this.prisma.$transaction(archive) : await archive(this.prisma);
    return location;
  }

  async reactivateLocation(id: string, currentUserIsTest = false) {
    await this.findById(id, currentUserIsTest);
    return await (this.prisma as any).location.update({
      where: { id },
      data: { status: 'ACTIVE' },
      include: {
        owner: true,
      },
    });
  }

  async validateLocationExists(id: string, currentUserIsTest = false): Promise<boolean> {
    const location = await (this.prisma as any).location.findUnique({
      where: { id },
    });
    return !!location && location.isTest === currentUserIsTest;
  }

  async validateLocationActive(id: string, currentUserIsTest = false): Promise<boolean> {
    const location = await (this.prisma as any).location.findFirst({
      where: { id, isTest: currentUserIsTest, deletedAt: null },
    });
    return location?.status === 'ACTIVE' && !location.deletedAt;
  }

  private locationAuditValue(location: { name: string; description?: string | null; status: string }): string {
    return `${location.name} (${location.status})${location.description ? `: ${location.description}` : ''}`;
  }

}
