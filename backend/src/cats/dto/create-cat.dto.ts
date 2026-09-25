import { BadRequestException } from '@nestjs/common';
import { CatSex, SterilizationStatus } from '@prisma/client';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CreateCatCommand } from '../commands/create-cat.command';

export class CreateCatDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsIn(['FEMALE', 'MALE', 'UNKNOWN'])
  sex!: string;

  @IsString()
  @IsOptional()
  color?: string | null;

  @IsString()
  @IsOptional()
  estimatedBirthDate?: string | null;

  @IsString()
  @IsOptional()
  intakeDate?: string | null;

  @IsString()
  @IsOptional()
  rescueSource?: string | null;

  @IsString()
  @IsOptional()
  microchipNumber?: string | null;

  @IsString()
  @IsOptional()
  passportNumber?: string | null;

  @IsIn(['STERILIZED', 'NOT_STERILIZED', 'UNKNOWN'])
  sterilizationStatus!: string;

  @IsString()
  @IsOptional()
  currentLocationId?: string | null;

  toCommand(createdByUserId: string, currentUserIsTest: boolean): CreateCatCommand {
    const name = this.name?.trim();
    if (!name) {
      throw new BadRequestException('Cat name is required');
    }

    return new CreateCatCommand(
      name,
      this.parseEnum(this.sex, CatSex, 'sex'),
      this.optionalTrim(this.color),
      this.parseOptionalDate(this.estimatedBirthDate, 'estimatedBirthDate'),
      this.parseOptionalDate(this.intakeDate, 'intakeDate'),
      this.optionalTrim(this.rescueSource),
      this.optionalTrim(this.microchipNumber),
      this.optionalTrim(this.passportNumber),
      this.parseEnum(
        this.sterilizationStatus,
        SterilizationStatus,
        'sterilizationStatus',
      ),
      this.optionalTrim(this.currentLocationId),
      createdByUserId,
      currentUserIsTest,
    );
  }

  private optionalTrim(value?: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private parseEnum<T extends string>(
    value: string,
    values: Record<string, T>,
    field: string,
  ): T {
    const validValues = Object.values(values);
    const parsed = validValues.find((validValue) => validValue === value);
    if (!parsed) {
      throw new BadRequestException(
        `Invalid ${field}. Must be one of: ${validValues.join(', ')}`,
      );
    }
    return parsed;
  }

  private parseOptionalDate(value: string | null | undefined, field: string): Date | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${field} must be a valid date`);
    }
    return date;
  }
}
