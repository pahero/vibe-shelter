import { BadRequestException } from "@nestjs/common";
import { VaccinationType } from "@prisma/client";
import { IsDateString, IsIn, IsOptional, IsString } from "class-validator";

export type VaccinationPayload = {
  type: VaccinationType;
  date: Date;
  nextDueDate?: Date | null;
  vaccineName?: string | null;
};

const TYPES = Object.values(VaccinationType);

function parseDate(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new BadRequestException("Date must be a valid ISO date");
  }
  return date;
}

function parseOptionalDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return parseDate(value);
}

function optionalText(value: string | null | undefined): string | null | undefined {
  if (value === undefined || value === null) return value;
  return value.trim() || null;
}

function parseType(value: string): VaccinationType {
  if (TYPES.includes(value as VaccinationType)) return value as VaccinationType;
  throw new BadRequestException(`type must be one of: ${TYPES.join(", ")}`);
}

export class CreateVaccinationDto {
  @IsIn(TYPES)
  type!: string;

  @IsDateString()
  date!: string;

  @IsDateString()
  @IsOptional()
  nextDueDate?: string | null;

  @IsString()
  @IsOptional()
  vaccineName?: string | null;

  toCommand(): VaccinationPayload {
    return {
      type: parseType(this.type),
      date: parseDate(this.date),
      nextDueDate: parseOptionalDate(this.nextDueDate),
      vaccineName: optionalText(this.vaccineName),
    };
  }
}

export class UpdateVaccinationDto {
  @IsIn(TYPES)
  @IsOptional()
  type?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsDateString()
  @IsOptional()
  nextDueDate?: string | null;

  @IsString()
  @IsOptional()
  vaccineName?: string | null;

  toCommand(): Partial<VaccinationPayload> {
    return {
      ...(this.type !== undefined ? { type: parseType(this.type) } : {}),
      ...(this.date !== undefined ? { date: parseDate(this.date) } : {}),
      ...(this.nextDueDate !== undefined ? { nextDueDate: parseOptionalDate(this.nextDueDate) } : {}),
      ...(this.vaccineName !== undefined ? { vaccineName: optionalText(this.vaccineName) } : {}),
    };
  }
}
