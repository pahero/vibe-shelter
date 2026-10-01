import { BadRequestException } from "@nestjs/common";
import { PreventiveTreatmentType } from "@prisma/client";
import { IsDateString, IsOptional, IsString } from "class-validator";
import { IsIn } from "class-validator";
export type PreventiveTreatmentPayload = {
  date: Date;
  name: string;
  type: PreventiveTreatmentType;
};
function toDate(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value)
    throw new BadRequestException("date must be a valid ISO date");
  return date;
}
function toName(value: string): string {
  const name = value?.trim();
  if (!name) throw new BadRequestException("name is required");
  return name;
}
const TREATMENT_TYPES = Object.values(PreventiveTreatmentType);
function toType(value: string | undefined): PreventiveTreatmentType {
  if (value === undefined) return PreventiveTreatmentType.OTHER;
  if (TREATMENT_TYPES.includes(value as PreventiveTreatmentType))
    return value as PreventiveTreatmentType;
  throw new BadRequestException(
    `type must be one of: ${TREATMENT_TYPES.join(", ")}`,
  );
}
export class CreatePreventiveTreatmentDto {
  @IsDateString() date!: string;
  @IsString() name!: string;
  @IsIn(TREATMENT_TYPES) @IsOptional() type?: string;
  toCommand(): PreventiveTreatmentPayload {
    return {
      date: toDate(this.date),
      name: toName(this.name),
      type: toType(this.type),
    };
  }
}
export class UpdatePreventiveTreatmentDto {
  @IsDateString() @IsOptional() date?: string;
  @IsString() @IsOptional() name?: string;
  @IsIn(TREATMENT_TYPES) @IsOptional() type?: string;
  toCommand(): Partial<PreventiveTreatmentPayload> {
    return {
      ...(this.date !== undefined && { date: toDate(this.date) }),
      ...(this.name !== undefined && { name: toName(this.name) }),
      ...(this.type !== undefined && { type: toType(this.type) }),
    };
  }
}
