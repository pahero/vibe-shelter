import { BadRequestException } from "@nestjs/common";
import { IsDateString, IsOptional, IsString } from "class-validator";

export type MedicalNotePayload = { date: Date; comment: string };
function toDate(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value)
    throw new BadRequestException("date must be a valid ISO date");
  return date;
}
function toComment(value: string): string {
  const comment = value?.trim();
  if (!comment) throw new BadRequestException("comment is required");
  return comment;
}
export class CreateMedicalNoteDto {
  @IsDateString() date!: string;
  @IsString() comment!: string;
  toCommand(): MedicalNotePayload {
    return { date: toDate(this.date), comment: toComment(this.comment) };
  }
}
export class UpdateMedicalNoteDto {
  @IsDateString() @IsOptional() date?: string;
  @IsString() @IsOptional() comment?: string;
  toCommand(): Partial<MedicalNotePayload> {
    return {
      ...(this.date !== undefined && { date: toDate(this.date) }),
      ...(this.comment !== undefined && { comment: toComment(this.comment) }),
    };
  }
}
