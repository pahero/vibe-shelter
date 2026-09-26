import { BadRequestException } from "@nestjs/common";
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export type TreatmentPayload = {
  shortName: string;
  instructions: string | null;
  startDate: Date;
  endDate: Date | null;
  dosesPerDay: number;
};

function toDate(value: string, field: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new BadRequestException(`${field} must be a valid ISO date`);
  }
  return date;
}

function toRequiredText(value: string, field: string): string {
  const result = value?.trim();
  if (!result) throw new BadRequestException(`${field} is required`);
  return result;
}

export class CreateTreatmentDto {
  @IsString()
  shortName!: string;

  @IsString()
  @IsOptional()
  instructions?: string | null;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  @IsOptional()
  endDate?: string | null;

  @IsInt()
  @Min(1)
  @Max(2)
  dosesPerDay!: number;

  toCommand(): TreatmentPayload {
    const startDate = toDate(this.startDate, "startDate");
    const endDate = this.endDate == null ? null : toDate(this.endDate, "endDate");
    if (endDate && endDate < startDate) {
      throw new BadRequestException("endDate cannot be before startDate");
    }
    return {
      shortName: toRequiredText(this.shortName, "shortName"),
      instructions: this.instructions?.trim() || null,
      startDate,
      endDate,
      dosesPerDay: this.dosesPerDay,
    };
  }
}

export class UpdateTreatmentDto {
  @IsString()
  @IsOptional()
  shortName?: string;

  @IsString()
  @IsOptional()
  instructions?: string | null;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string | null;

  @IsInt()
  @Min(1)
  @Max(2)
  @IsOptional()
  dosesPerDay?: number;

  toCommand(): Partial<TreatmentPayload> {
    return {
      ...(this.shortName !== undefined && { shortName: toRequiredText(this.shortName, "shortName") }),
      ...(this.instructions !== undefined && { instructions: this.instructions?.trim() || null }),
      ...(this.startDate !== undefined && { startDate: toDate(this.startDate, "startDate") }),
      ...(this.endDate !== undefined && { endDate: this.endDate === null ? null : toDate(this.endDate, "endDate") }),
      ...(this.dosesPerDay !== undefined && { dosesPerDay: this.dosesPerDay }),
    };
  }
}

export class SetTreatmentAdministrationDto {
  @IsDateString()
  date!: string;

  @IsInt()
  @Min(1)
  @Max(2)
  doseNumber!: number;

  @IsBoolean()
  checked!: boolean;

  toCommand(): { date: Date; doseNumber: number; checked: boolean } {
    return { date: toDate(this.date, "date"), doseNumber: this.doseNumber, checked: this.checked };
  }
}
