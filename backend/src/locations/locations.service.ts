// src/locations/locations.service.ts
import {
  Injectable,
  Optional,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateLocationDto, UpdateLocationDto } from './dto';
import { Prisma } from '@prisma/client';
import { AuditActor, AuditService } from '../audit/audit.service';

const VALID_LOCATION_STATUSES = ['ACTIVE', 'INACTIVE', 'ARCHIVED'];

export interface LocationFilters {
  ownerId?: string;
  status?: string;
  skip?: number;
  limit?: number;
}

@Injectable()
export class LocationsService {
  constructor(
    private prisma: PrismaService,
    @Optional() private audit?: AuditService,
  ) {}

  async createLocation(data: CreateLocationDto, actor?: AuditActor | null) {
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
      const location = await (this.prisma as any).location.create({
        data: {
          name: data.name.trim(),
          description: data.description?.trim(),
          ownerId: data.ownerId || null,
          status: 'ACTIVE',
        },
        include: {
          owner: true,
        },
      });
      await this.audit?.record({
        actor,
        action: 'create',
        entityType: 'location',
        entityId: location.id,
        entityName: location.name,
        oldValues: null,
        newValues: this.locationAuditValues(location),
      });
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

  async findAll(filters: LocationFilters = {}) {
    const { ownerId, status, skip = 0, limit = 50 } = filters;

    // Build where clause
    const where: any = {};
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

  async findById(id: string) {
    if (!id || id.trim().length === 0) {
      throw new BadRequestException('Location ID is required');
    }

    const location = await (this.prisma as any).location.findUnique({
      where: { id },
      include: {
        owner: true,
      },
    });

    if (!location) {
      throw new NotFoundException(`Location not found`);
    }

    return location;
  }

  async findByOwnerId(ownerId: string) {
    if (!ownerId || ownerId.trim().length === 0) {
      throw new BadRequestException('Owner ID is required');
    }

    return await (this.prisma as any).location.findMany({
      where: { ownerId },
      include: {
        owner: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async updateLocation(id: string, data: UpdateLocationDto, actor?: AuditActor | null) {
    // Verify location exists
    const existingLocation = await this.findById(id);

    // If updating name, check uniqueness (except current location)
    if (data.name) {
      const existing = await (this.prisma as any).location.findUnique({
        where: { name: data.name.trim() },
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

    const location = await (this.prisma as any).location.update({
      where: { id },
      data: updateData,
      include: {
        owner: true,
      },
    });
    await this.audit?.record({
      actor,
      action: 'update',
      entityType: 'location',
      entityId: location.id,
      entityName: location.name,
      oldValues: this.locationAuditValues(existingLocation),
      newValues: this.locationAuditValues(location),
    });
    return location;
  }

  async archiveLocation(id: string, actor?: AuditActor | null) {
    const existingLocation = await this.findById(id);
    const location = await (this.prisma as any).location.update({
      where: { id },
      data: { status: 'ARCHIVED' },
      include: {
        owner: true,
      },
    });
    await this.audit?.record({
      actor,
      action: 'archive',
      entityType: 'location',
      entityId: location.id,
      entityName: location.name,
      oldValues: this.locationAuditValues(existingLocation),
      newValues: this.locationAuditValues(location),
    });
    return location;
  }

  async reactivateLocation(id: string) {
    await this.findById(id);
    return await (this.prisma as any).location.update({
      where: { id },
      data: { status: 'ACTIVE' },
      include: {
        owner: true,
      },
    });
  }

  async validateLocationExists(id: string): Promise<boolean> {
    const location = await (this.prisma as any).location.findUnique({
      where: { id },
    });
    return !!location;
  }

  async validateLocationActive(id: string): Promise<boolean> {
    const location = await (this.prisma as any).location.findUnique({
      where: { id },
    });
    return location?.status === 'ACTIVE';
  }

  private locationAuditValues(location: any) {
    return {
      name: location.name,
      description: location.description ?? null,
      ownerId: location.ownerId ?? null,
      status: location.status,
    };
  }
}
