import { BadRequestException } from "@nestjs/common";
import { IsDateString, IsOptional, IsString } from "class-validator";
export type PreventiveTreatmentPayload = { date: Date; name: string };
function toDate(value: string): Date { const date = new Date(`${value}T00:00:00.000Z`); if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new BadRequestException("date must be a valid ISO date"); return date; }
function toName(value: string): string { const name = value?.trim(); if (!name) throw new BadRequestException("name is required"); return name; }
export class CreatePreventiveTreatmentDto { @IsDateString() date!: string; @IsString() name!: string; toCommand(): PreventiveTreatmentPayload { return { date: toDate(this.date), name: toName(this.name) }; } }
export class UpdatePreventiveTreatmentDto { @IsDateString() @IsOptional() date?: string; @IsString() @IsOptional() name?: string; toCommand(): Partial<PreventiveTreatmentPayload> { return { ...(this.date !== undefined && { date: toDate(this.date) }), ...(this.name !== undefined && { name: toName(this.name) }) }; } }
