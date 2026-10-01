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

export class CreateFlightDto {
  @IsDateString()
  date!: string;

  @IsString()
  airport!: string;

  @IsString()
  flightNumber!: string;

  @IsString()
  flightParent!: string;

  toCommand(actorUserId: string, isTest: boolean): CreateFlightCommand {
    return new CreateFlightCommand(
      parseDate(this.date),
      parseRequiredString(this.airport, "airport"),
      parseRequiredString(this.flightNumber, "flightNumber"),
      parseRequiredString(this.flightParent, "flightParent"),
      actorUserId,
      isTest,
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
  flightNumber?: string;

  @IsString()
  @IsOptional()
  flightParent?: string;

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
        : parseRequiredString(this.flightNumber, "flightNumber"),
      this.flightParent === undefined
        ? undefined
        : parseRequiredString(this.flightParent, "flightParent"),
      actorUserId,
      isTest,
    );
  }
}
