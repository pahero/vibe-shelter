import { BadRequestException } from "@nestjs/common";
import { ParasiteTreatmentType } from "@prisma/client";
import { IsDateString, IsIn, IsOptional, IsString } from "class-validator";

export type ParasiteTreatmentPayload = {
  type: ParasiteTreatmentType;
  date: Date;
  nextDueDate?: Date | null;
  productName: string;
};

const TYPES = Object.values(ParasiteTreatmentType);

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

function requiredText(value: string): string {
  const text = value?.trim();
  if (!text) throw new BadRequestException("productName is required");
  return text;
}

function parseType(value: string): ParasiteTreatmentType {
  if (TYPES.includes(value as ParasiteTreatmentType)) return value as ParasiteTreatmentType;
  throw new BadRequestException(`type must be one of: ${TYPES.join(", ")}`);
}

export class CreateParasiteTreatmentDto {
  @IsIn(TYPES)
  type!: string;

  @IsDateString()
  date!: string;

  @IsDateString()
  @IsOptional()
  nextDueDate?: string | null;

  @IsString()
  productName!: string;

  toCommand(): ParasiteTreatmentPayload {
    return {
      type: parseType(this.type),
      date: parseDate(this.date),
      nextDueDate: parseOptionalDate(this.nextDueDate),
      productName: requiredText(this.productName),
    };
  }
}

export class UpdateParasiteTreatmentDto {
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
  productName?: string;

  toCommand(): Partial<ParasiteTreatmentPayload> {
    return {
      ...(this.type !== undefined ? { type: parseType(this.type) } : {}),
      ...(this.date !== undefined ? { date: parseDate(this.date) } : {}),
      ...(this.nextDueDate !== undefined ? { nextDueDate: parseOptionalDate(this.nextDueDate) } : {}),
      ...(this.productName !== undefined ? { productName: requiredText(this.productName) } : {}),
    };
  }
}
