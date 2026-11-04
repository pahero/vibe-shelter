import { BadRequestException } from "@nestjs/common";
import { IsDateString, IsOptional, IsString } from "class-validator";
import { CreateFlightCommand } from "../commands/create-flight.command";
import { UpdateFlightCommand } from "../commands/update-flight.command";

function parseDate(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new BadRequestException("date must be a valid ISO date");
  }
  return date;
}

function parseRequiredString(value: string, field: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new BadRequestException(`${field} is required`);
  return normalized;
}

function parseOptionalString(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

export class CreateFlightDto {
  @IsDateString()
  date!: string;

  @IsString()
  airport!: string;

  @IsOptional()
  @IsString()
  flightNumber?: string | null;

  @IsOptional()
  @IsString()
  flightParent?: string | null;

  @IsOptional()
  @IsString()
  comment?: string | null;

  toCommand(actorUserId: string, isTest: boolean): CreateFlightCommand {
    return new CreateFlightCommand(
      parseDate(this.date),
      parseRequiredString(this.airport, "airport"),
      parseOptionalString(this.flightNumber),
      parseOptionalString(this.flightParent),
      actorUserId,
      isTest,
      parseOptionalString(this.comment),
    );
  }
}

export class UpdateFlightDto {
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  airport?: string;

  @IsString()
  @IsOptional()
  flightNumber?: string | null;

  @IsString()
  @IsOptional()
  flightParent?: string | null;

  @IsString()
  @IsOptional()
  comment?: string | null;

  toCommand(
    flightId: string,
    actorUserId: string,
    isTest: boolean,
  ): UpdateFlightCommand {
    return new UpdateFlightCommand(
      flightId,
      this.date === undefined ? undefined : parseDate(this.date),
      this.airport === undefined
        ? undefined
        : parseRequiredString(this.airport, "airport"),
      this.flightNumber === undefined
        ? undefined
        : parseOptionalString(this.flightNumber),
      this.flightParent === undefined
        ? undefined
        : parseOptionalString(this.flightParent),
      actorUserId,
      isTest,
      this.comment === undefined
        ? undefined
        : parseOptionalString(this.comment),
    );
  }
}
