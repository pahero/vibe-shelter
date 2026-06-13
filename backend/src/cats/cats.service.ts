import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateCatDto, UpdateCatDto } from './dto';
import { CatPhotoUrlService } from './cat-photo-url.service';

const VALID_CAT_SEXES = ['FEMALE', 'MALE', 'UNKNOWN'] as const;
const VALID_STERILIZATION_STATUSES = [
  'STERILIZED',
  'NOT_STERILIZED',
  'UNKNOWN',
] as const;
const VALID_CAT_STATUSES = ['ACTIVE', 'ADOPTED', 'DECEASED', 'ARCHIVED'] as const;

type CatWithLocation = {
  id: string;
  name: string;
  sex: string;
  color: string | null;
  estimatedBirthDate: Date | null;
  intakeDate: Date | null;
  status: string;
  sterilizationStatus: string;
  currentLocationId: string | null;
  currentLocation: { name: string } | null;
  primaryPhotoKey: string | null;
  microchipNumber: string | null;
  updatedAt: Date;
};

export type CatCard = {
  id: string;
  name: string;
  sex: string;
  color: string | null;
  estimatedBirthDate: string | null;
  intakeDate: string | null;
  status: string;
  sterilizationStatus: string;
  currentLocationId: string | null;
  currentLocationName: string | null;
  primaryPhotoUrl: string | null;
  microchipNumber: string | null;
  updatedAt: string;
};

export type CatFilters = {
  locationId?: string;
  status?: string;
  search?: string;
  skip?: number;
  limit?: number;
};

export type PrimaryPhotoUpload = {
  originalname?: string;
  mimetype?: string;
  buffer?: Buffer;
};

@Injectable()
export class CatsService {
  constructor(
    private prisma: PrismaService,
    private photoUrls: CatPhotoUrlService,
  ) {}

  async createCat(data: CreateCatDto): Promise<CatCard> {
    this.validateCreate(data);
    await this.validateActiveLocation(data.currentLocationId);

    try {
      const cat = await (this.prisma as any).cat.create({
        data: this.toCreateData(data),
        include: { currentLocation: { select: { name: true } } },
      });
      return this.toCatCard(cat);
    } catch (error) {
      this.handlePrismaError(error);
      throw error;
    }
  }

  async updateCat(id: string, data: UpdateCatDto): Promise<CatCard> {
    this.validateId(id);
    this.validateUpdate(data);
    await this.findExistingCat(id);
    await this.validateActiveLocation(data.currentLocationId);

    try {
      const cat = await (this.prisma as any).cat.update({
        where: { id },
        data: this.toUpdateData(data),
        include: { currentLocation: { select: { name: true } } },
      });
      return this.toCatCard(cat);
    } catch (error) {
      this.handlePrismaError(error);
      throw error;
    }
  }

  async updatePrimaryPhoto(id: string, photo: PrimaryPhotoUpload | undefined): Promise<CatCard> {
    this.validateId(id);
    await this.findExistingCat(id);

    if (!photo?.buffer || photo.buffer.length === 0) {
      throw new BadRequestException('Primary photo file is required');
    }

    const key = await this.photoUrls.uploadPrimaryPhoto({
      catId: id,
      originalName: photo.originalname,
      contentType: photo.mimetype,
      body: photo.buffer,
    });

    const cat = await (this.prisma as any).cat.update({
      where: { id },
      data: { primaryPhotoKey: key },
      include: { currentLocation: { select: { name: true } } },
    });
    return this.toCatCard(cat);
  }

  async findAll(filters: CatFilters = {}) {
    const { skip, limit } = this.validatePagination(filters.skip, filters.limit);
    const status = filters.status ?? 'ACTIVE';
    this.validateEnum(status, VALID_CAT_STATUSES, 'status');

    const where: any = { status };
    if (filters.locationId) {
      where.currentLocationId = filters.locationId;
    }
    const search = filters.search?.trim();
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { microchipNumber: { contains: search, mode: 'insensitive' } },
        { passportNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      (this.prisma as any).cat.findMany({
        where,
        include: { currentLocation: { select: { name: true } } },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip,
        take: limit,
      }),
      (this.prisma as any).cat.count({ where }),
    ]);

    return {
      data: await Promise.all(data.map((cat: CatWithLocation) => this.toCatCard(cat))),
      total,
      skip,
      limit,
    };
  }

  async findCardById(id: string): Promise<CatCard> {
    this.validateId(id);
    const cat = await this.findExistingCat(id);
    return this.toCatCard(cat);
  }

  private async findExistingCat(id: string): Promise<CatWithLocation> {
    const cat = await (this.prisma as any).cat.findUnique({
      where: { id },
      include: { currentLocation: { select: { name: true } } },
    });
    if (!cat) {
      throw new NotFoundException('Cat not found');
    }
    return cat;
  }

  private async validateActiveLocation(locationId?: string | null): Promise<void> {
    if (locationId === undefined || locationId === null || locationId === '') {
      return;
    }
    const location = await (this.prisma as any).location.findUnique({
      where: { id: locationId },
      select: { status: true },
    });
    if (location?.status !== 'ACTIVE') {
      throw new NotFoundException('Active location not found');
    }
  }

  private validateCreate(data: CreateCatDto): void {
    this.validateName(data.name, true);
    this.validateRequiredEnum(data.sex, VALID_CAT_SEXES, 'sex');
    this.validateRequiredEnum(
      data.sterilizationStatus,
      VALID_STERILIZATION_STATUSES,
      'sterilizationStatus',
    );
    this.validateOptionalDates(data);
  }

  private validateUpdate(data: UpdateCatDto): void {
    if (data.name !== undefined) {
      this.validateName(data.name, false);
    }
    if (data.sex !== undefined) {
      this.validateRequiredEnum(data.sex, VALID_CAT_SEXES, 'sex');
    }
    if (data.sterilizationStatus !== undefined) {
      this.validateRequiredEnum(
        data.sterilizationStatus,
        VALID_STERILIZATION_STATUSES,
        'sterilizationStatus',
      );
    }
    if (data.status !== undefined) {
      this.validateEnum(data.status, VALID_CAT_STATUSES, 'status');
    }
    this.validateOptionalDates(data);
  }

  private validateName(name: string | undefined, required: boolean): void {
    if ((required && name === undefined) || name === null || name?.trim().length === 0) {
      throw new BadRequestException('Cat name is required');
    }
  }

  private validateRequiredEnum<T extends readonly string[]>(
    value: string | null | undefined,
    validValues: T,
    field: string,
  ): void {
    if (value === undefined || value === null) {
      throw new BadRequestException(`${field} is required`);
    }
    this.validateEnum(value, validValues, field);
  }

  private validateEnum<T extends readonly string[]>(
    value: string,
    validValues: T,
    field: string,
  ): void {
    if (!validValues.includes(value)) {
      throw new BadRequestException(
        `Invalid ${field}. Must be one of: ${validValues.join(', ')}`,
      );
    }
  }

  private validateOptionalDates(data: { estimatedBirthDate?: string | null; intakeDate?: string | null }): void {
    this.parseOptionalDate(data.estimatedBirthDate, 'estimatedBirthDate');
    this.parseOptionalDate(data.intakeDate, 'intakeDate');
  }

  private parseOptionalDate(value: string | null | undefined, field: string): Date | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null || value === '') {
      return null;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${field} must be a valid date`);
    }
    return date;
  }

  private validatePagination(skipInput = 0, limitInput = 50): { skip: number; limit: number } {
    const skip = Number(skipInput);
    const limit = Number(limitInput);
    if (!Number.isInteger(skip) || skip < 0) {
      throw new BadRequestException('skip must be a non-negative integer');
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException('limit must be an integer between 1 and 100');
    }
    return { skip, limit };
  }

  private validateId(id: string): void {
    if (!id || id.trim().length === 0) {
      throw new BadRequestException('Cat ID is required');
    }
  }

  private toCreateData(data: CreateCatDto): any {
    return {
      name: data.name.trim(),
      sex: data.sex,
      color: this.optionalTrim(data.color),
      estimatedBirthDate: this.parseOptionalDate(data.estimatedBirthDate, 'estimatedBirthDate'),
      intakeDate: this.parseOptionalDate(data.intakeDate, 'intakeDate'),
      rescueSource: this.optionalTrim(data.rescueSource),
      microchipNumber: this.optionalTrim(data.microchipNumber),
      passportNumber: this.optionalTrim(data.passportNumber),
      sterilizationStatus: data.sterilizationStatus,
      currentLocationId: data.currentLocationId || null,
    };
  }

  private toUpdateData(data: UpdateCatDto): any {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.sex !== undefined) updateData.sex = data.sex;
    if (data.color !== undefined) updateData.color = this.optionalTrim(data.color);
    if (data.estimatedBirthDate !== undefined) updateData.estimatedBirthDate = this.parseOptionalDate(data.estimatedBirthDate, 'estimatedBirthDate');
    if (data.intakeDate !== undefined) updateData.intakeDate = this.parseOptionalDate(data.intakeDate, 'intakeDate');
    if (data.rescueSource !== undefined) updateData.rescueSource = this.optionalTrim(data.rescueSource);
    if (data.microchipNumber !== undefined) updateData.microchipNumber = this.optionalTrim(data.microchipNumber);
    if (data.passportNumber !== undefined) updateData.passportNumber = this.optionalTrim(data.passportNumber);
    if (data.sterilizationStatus !== undefined) updateData.sterilizationStatus = data.sterilizationStatus;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.currentLocationId !== undefined) updateData.currentLocationId = data.currentLocationId || null;
    return updateData;
  }

  private optionalTrim(value?: string | null): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }

  private async toCatCard(cat: CatWithLocation): Promise<CatCard> {
    return {
      id: cat.id,
      name: cat.name,
      sex: cat.sex,
      color: cat.color,
      estimatedBirthDate: cat.estimatedBirthDate?.toISOString() ?? null,
      intakeDate: cat.intakeDate?.toISOString() ?? null,
      status: cat.status,
      sterilizationStatus: cat.sterilizationStatus,
      currentLocationId: cat.currentLocationId,
      currentLocationName: cat.currentLocation?.name ?? null,
      primaryPhotoUrl: await this.photoUrls.getPrimaryPhotoUrl(cat.primaryPhotoKey),
      microchipNumber: cat.microchipNumber,
      updatedAt: cat.updatedAt.toISOString(),
    };
  }

  private handlePrismaError(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('A cat with this microchip or passport number already exists');
    }
  }
}
