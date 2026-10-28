import { BadRequestException } from "@nestjs/common";
import { CatIntakeSource, CatSex, SterilizationStatus } from "@prisma/client";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { CreateCatCommand } from "../commands/create-cat.command";

export class CreateCatDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  nameNumber?: number;

  @IsIn(["FEMALE", "MALE", "UNKNOWN"])
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
  intakeDetails?: string | null;

  @IsIn([
    "SHELTER_VOLUNTEER",
    "OWNER_SURRENDER",
    "RESCUE_REQUEST",
    "VET_CLINIC",
    "RESCUE_ORGANISATION",
    "OTHER",
  ])
  @IsOptional()
  intakeSource?: string | null;

  @IsString()
  @IsOptional()
  microchipNumber?: string | null;

  @IsBoolean()
  @IsOptional()
  passport?: boolean;

  @IsString()
  @IsOptional()
  sponsorName?: string | null;

  @IsString()
  @IsOptional()
  adopterName?: string | null;

  @IsString()
  @IsOptional()
  adopterAddress?: string | null;

  @IsBoolean()
  @IsOptional()
  felvFivTestDone?: boolean;

  @IsIn(["STERILIZED", "NOT_STERILIZED", "UNKNOWN"])
  sterilizationStatus!: string;

  @IsString()
  @IsOptional()
  currentLocationId?: string | null;

  toCommand(
    createdByUserId: string,
    currentUserIsTest: boolean,
  ): CreateCatCommand {
    const name = this.name?.trim();
    if (!name) {
      throw new BadRequestException("Cat name is required");
    }

    return new CreateCatCommand(
      name,
      this.parseEnum(this.sex, CatSex, "sex"),
      this.optionalTrim(this.color),
      this.parseOptionalDate(this.estimatedBirthDate, "estimatedBirthDate"),
      this.parseOptionalDate(this.intakeDate, "intakeDate"),
      this.optionalTrim(this.intakeDetails),
      this.intakeSource
        ? this.parseEnum(this.intakeSource, CatIntakeSource, "intakeSource")
        : null,
      this.optionalTrim(this.microchipNumber),
      this.passport ?? false,
      this.optionalTrim(this.sponsorName),
      this.parseEnum(
        this.sterilizationStatus,
        SterilizationStatus,
        "sterilizationStatus",
      ),
      this.optionalTrim(this.currentLocationId),
      createdByUserId,
      currentUserIsTest,
      this.nameNumber,
      this.optionalTrim(this.adopterName),
      this.optionalTrim(this.adopterAddress),
      this.felvFivTestDone ?? false,
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
        `Invalid ${field}. Must be one of: ${validValues.join(", ")}`,
      );
    }
    return parsed;
  }

  private parseOptionalDate(
    value: string | null | undefined,
    field: string,
  ): Date | null {
    if (value === undefined || value === null || value === "") {
      return null;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${field} must be a valid date`);
    }
    return date;
  }
}
