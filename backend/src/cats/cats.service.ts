import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { CreateCatTagDto, CreateCatWeightDto, UpdateCatDto, UpdateCatTagDto } from './dto';
import { CatPhotoUrlService } from './cat-photo-url.service';

const VALID_CAT_SEXES = ['FEMALE', 'MALE', 'UNKNOWN'] as const;
const VALID_STERILIZATION_STATUSES = [
  'STERILIZED',
  'NOT_STERILIZED',
  'UNKNOWN',
] as const;
const VALID_CAT_STATUSES = ['ACTIVE', 'ADOPTED', 'DECEASED', 'ARCHIVED'] as const;
const VALID_TAG_COLORS = [
  '#ffb38a',
  '#f5a3ad',
  '#ffd166',
  '#9ee6a8',
  '#8ecaff',
  '#b8a7ff',
  '#eda6f0',
  '#95d8c8',
  '#ffd6a5',
  '#f7e36d',
  '#caffbf',
  '#9bf6ff',
  '#a0c4ff',
  '#bdb2ff',
  '#ffc6ff',
  '#e7c6ff',
  '#cdeac0',
  '#f2a7b7',
  '#bde0fe',
  '#d8b996',
] as const;

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
  tags?: Array<{ tag: CatTag }>;
};

export type CatTag = {
  id: string;
  name: string;
  color: string;
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
  tags: CatTag[];
};

export type CatFilters = {
  locationId?: string;
  status?: string;
  search?: string;
  tagId?: string;
  skip?: number;
  limit?: number;
};

export type CatWeight = {
  id: string;
  catId: string;
  weightKg: number;
  measuredAt: string;
  createdAt: string;
};

export type CatPhoto = {
  id: string;
  catId: string;
  url: string | null;
  isPrimary: boolean;
  createdAt: string;
};

export type PrimaryPhotoUpload = {
  originalname?: string;
  mimetype?: string;
  buffer?: Buffer;
};

@Injectable()
export class CatsService {
  constructor(
    private prisma: PrismaClient,
    private photoUrls: CatPhotoUrlService,
  ) {}

  async updateCat(id: string, data: UpdateCatDto): Promise<CatCard> {
    this.validateId(id);
    this.validateUpdate(data);
    await this.findExistingCat(id);
    await this.validateActiveLocation(data.currentLocationId);

    try {
      const cat = await (this.prisma as any).cat.update({
        where: { id },
        data: this.toUpdateData(data),
        include: this.catCardInclude(),
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

    const created = await this.addPhoto(id, photo);

    const cat = await (this.prisma as any).cat.update({
      where: { id },
      data: { primaryPhotoKey: await this.findPhotoKey(created.id) },
      include: this.catCardInclude(),
    });
    return this.toCatCard(cat);
  }

  async listPhotos(catId: string): Promise<CatPhoto[]> {
    this.validateId(catId);
    const cat = await this.findExistingCat(catId);
    const photos = await (this.prisma as any).catPhoto.findMany({
      where: { catId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return Promise.all(photos.map((photo: any) => this.toCatPhoto(photo, cat.primaryPhotoKey)));
  }

  async addPhoto(catId: string, photo: PrimaryPhotoUpload | undefined): Promise<CatPhoto> {
    this.validateId(catId);
    const cat = await this.findExistingCat(catId);

    if (!photo?.buffer || photo.buffer.length === 0) {
      throw new BadRequestException('Photo file is required');
    }

    const key = await this.photoUrls.uploadPrimaryPhoto({
      catId,
      originalName: photo.originalname,
      contentType: photo.mimetype,
      body: photo.buffer,
    });
    const created = await (this.prisma as any).catPhoto.create({ data: { catId, key } });

    if (!cat.primaryPhotoKey) {
      await (this.prisma as any).cat.update({ where: { id: catId }, data: { primaryPhotoKey: key } });
      return this.toCatPhoto(created, key);
    }

    return this.toCatPhoto(created, cat.primaryPhotoKey);
  }

  async setPrimaryPhoto(catId: string, photoId: string): Promise<CatCard> {
    this.validateId(catId);
    this.validateId(photoId);
    await this.findExistingCat(catId);
    const photo = await this.findExistingPhoto(catId, photoId);
    const cat = await (this.prisma as any).cat.update({
      where: { id: catId },
      data: { primaryPhotoKey: photo.key },
      include: this.catCardInclude(),
    });
    return this.toCatCard(cat);
  }

  async deletePhoto(catId: string, photoId: string): Promise<CatCard> {
    this.validateId(catId);
    this.validateId(photoId);
    const cat = await this.findExistingCat(catId);
    const photo = await this.findExistingPhoto(catId, photoId);
    await (this.prisma as any).catPhoto.delete({ where: { id: photoId } });
    await this.photoUrls.deletePhoto(photo.key);

    let primaryPhotoKey = cat.primaryPhotoKey;
    if (cat.primaryPhotoKey === photo.key) {
      const nextPhoto = await (this.prisma as any).catPhoto.findFirst({
        where: { catId },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
      primaryPhotoKey = nextPhoto?.key ?? null;
      await (this.prisma as any).cat.update({ where: { id: catId }, data: { primaryPhotoKey } });
    }

    return this.findCardById(catId);
  }

  async findAll(filters: CatFilters = {}) {
    const { skip, limit } = this.validatePagination(filters.skip, filters.limit);
    const status = filters.status ?? 'ACTIVE';
    this.validateEnum(status, VALID_CAT_STATUSES, 'status');

    const where: any = { status };
    if (filters.locationId) {
      where.currentLocationId = filters.locationId;
    }
    if (filters.tagId) {
      where.tags = { some: { tagId: filters.tagId } };
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
        include: this.catCardInclude(),
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

  async listTags(): Promise<CatTag[]> {
    const tags = await (this.prisma as any).catTag.findMany({
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
    return tags.map((tag: any) => this.toCatTag(tag));
  }

  async createTag(data: CreateCatTagDto): Promise<CatTag> {
    const name = this.validateTagName(data.name);
    const color = this.validateTagColor(data.color);

    const existing = await (this.prisma as any).catTag.findUnique({ where: { name } });
    if (existing) {
      return this.toCatTag(existing);
    }

    const tag = await (this.prisma as any).catTag.create({ data: { name, color } });
    return this.toCatTag(tag);
  }

  async updateTag(id: string, data: UpdateCatTagDto): Promise<CatTag> {
    this.validateId(id);
    if (data.name === undefined && data.color === undefined) {
      throw new BadRequestException('Tag name or color is required');
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = this.validateTagName(data.name);
    if (data.color !== undefined) updateData.color = this.validateTagColor(data.color);

    try {
      await this.findExistingTag(id);
      const tag = await (this.prisma as any).catTag.update({ where: { id }, data: updateData });
      return this.toCatTag(tag);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Tag not found');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A tag with this name already exists');
      }
      throw error;
    }
  }

  async deleteTag(id: string): Promise<void> {
    this.validateId(id);
    await this.findExistingTag(id);

    const usedCount = await (this.prisma as any).catTagOnCat.count({ where: { tagId: id } });
    if (usedCount > 0) {
      throw new ConflictException('Cannot remove a tag that is used by cats');
    }

    await (this.prisma as any).catTag.delete({ where: { id } });
  }

  async addTag(catId: string, tagId: string): Promise<CatCard> {
    this.validateId(catId);
    this.validateId(tagId);
    await this.findExistingCat(catId);
    await this.findExistingTag(tagId);

    await (this.prisma as any).catTagOnCat.upsert({
      where: { catId_tagId: { catId, tagId } },
      create: { catId, tagId },
      update: {},
    });

    return this.findCardById(catId);
  }

  async removeTag(catId: string, tagId: string): Promise<CatCard> {
    this.validateId(catId);
    this.validateId(tagId);
    await this.findExistingCat(catId);
    await this.findExistingTag(tagId);
    await (this.prisma as any).catTagOnCat.deleteMany({ where: { catId, tagId } });
    return this.findCardById(catId);
  }

  async listWeights(catId: string): Promise<CatWeight[]> {
    this.validateId(catId);
    await this.findExistingCat(catId);

    const weights = await (this.prisma as any).catWeight.findMany({
      where: { catId },
      orderBy: [{ measuredAt: 'desc' }, { createdAt: 'desc' }],
    });

    return weights.map((weight: any) => this.toCatWeight(weight));
  }

  async addWeight(catId: string, data: CreateCatWeightDto): Promise<CatWeight> {
    this.validateId(catId);
    await this.findExistingCat(catId);
    const measuredAt = this.parseRequiredDate(data.measuredAt, 'measuredAt');
    this.validateWeightKg(data.weightKg);

    const weight = await (this.prisma as any).catWeight.create({
      data: {
        catId,
        weightKg: data.weightKg,
        measuredAt,
      },
    });

    return this.toCatWeight(weight);
  }

  async removeWeight(catId: string, weightId: string): Promise<void> {
    this.validateId(catId);
    this.validateId(weightId);
    await this.findExistingCat(catId);

    const weight = await (this.prisma as any).catWeight.findFirst({
      where: { id: weightId, catId },
    });
    if (!weight) {
      throw new NotFoundException('Weight entry not found');
    }

    await (this.prisma as any).catWeight.delete({ where: { id: weightId } });
  }

  private async findExistingCat(id: string): Promise<CatWithLocation> {
    const cat = await (this.prisma as any).cat.findUnique({
      where: { id },
      include: this.catCardInclude(),
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

  private validateUpdate(data: UpdateCatDto): void {
    if (data.name !== undefined) {
      this.validateName(data.name);
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

  private validateName(name: string | undefined): void {
    if (name === null || name?.trim().length === 0) {
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

  private parseRequiredDate(value: string | null | undefined, field: string): Date {
    if (value === undefined || value === null || value === '') {
      throw new BadRequestException(`${field} is required`);
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${field} must be a valid date`);
    }
    return date;
  }

  private validateWeightKg(value: number): void {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      throw new BadRequestException('weightKg must be a positive number');
    }
  }

  private validateTagName(value: string | undefined): string {
    const name = value?.trim();
    if (!name) {
      throw new BadRequestException('Tag name is required');
    }
    if (name.length > 40) {
      throw new BadRequestException('Tag name must be at most 40 characters');
    }
    return name;
  }

  private validateTagColor(value: string | undefined): string {
    const color = (value?.trim() || VALID_TAG_COLORS[0]).toLowerCase();
    if (!VALID_TAG_COLORS.includes(color as (typeof VALID_TAG_COLORS)[number])) {
      throw new BadRequestException('Tag color must be one of the allowed colors');
    }
    return color;
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

  private async findExistingTag(id: string): Promise<CatTag> {
    const tag = await (this.prisma as any).catTag.findUnique({ where: { id } });
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }
    return this.toCatTag(tag);
  }

  private async findExistingPhoto(catId: string, photoId: string): Promise<{ id: string; key: string; createdAt: Date }> {
    const photo = await (this.prisma as any).catPhoto.findFirst({ where: { id: photoId, catId } });
    if (!photo) {
      throw new NotFoundException('Photo not found');
    }
    return photo;
  }

  private async findPhotoKey(photoId: string): Promise<string> {
    const photo = await (this.prisma as any).catPhoto.findUnique({ where: { id: photoId } });
    if (!photo) throw new NotFoundException('Photo not found');
    return photo.key;
  }

  private catCardInclude() {
    return {
      currentLocation: { select: { name: true } },
      tags: { include: { tag: true }, orderBy: { tag: { name: 'asc' } } },
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
      tags: cat.tags?.map((item) => this.toCatTag(item.tag)) ?? [],
    };
  }

  private toCatTag(tag: any): CatTag {
    return {
      id: tag.id,
      name: tag.name,
      color: tag.color,
    };
  }

  private async toCatPhoto(photo: any, primaryPhotoKey: string | null): Promise<CatPhoto> {
    return {
      id: photo.id,
      catId: photo.catId,
      url: await this.photoUrls.getPhotoUrl(photo.key),
      isPrimary: photo.key === primaryPhotoKey,
      createdAt: photo.createdAt.toISOString(),
    };
  }

  private toCatWeight(weight: any): CatWeight {
    return {
      id: weight.id,
      catId: weight.catId,
      weightKg: weight.weightKg,
      measuredAt: weight.measuredAt.toISOString(),
      createdAt: weight.createdAt.toISOString(),
    };
  }

  private handlePrismaError(error: unknown): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('A cat with this microchip or passport number already exists');
    }
  }
}
