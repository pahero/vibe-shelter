import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator";
import { BadRequestException } from "@nestjs/common";

export type UpdateCatCommand = {
  name?: string;
  sex?: "FEMALE" | "MALE" | "UNKNOWN";
  color?: string | null;
  estimatedBirthDate?: Date | null;
  intakeDate?: Date | null;
  intakeDetails?: string | null;
  intakeSource?: "SHELTER_VOLUNTEER" | "OWNER_SURRENDER" | "RESCUE_REQUEST" | "VET_CLINIC" | "RESCUE_ORGANISATION" | "OTHER" | null;
  microchipNumber?: string | null;
  passport?: boolean;
  sponsorName?: string | null;
  adopterName?: string | null;
  adopterAddress?: string | null;
  felvFivTestDone?: boolean;
  sterilizationStatus?: "STERILIZED" | "NOT_STERILIZED" | "UNKNOWN";
  currentLocationId?: string | null;
};

function optionalText(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function optionalDate(
  value: string | null | undefined,
  field: string,
): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()))
    throw new BadRequestException(`${field} must be a valid date`);
  return date;
}

export class UpdateCatDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsIn(["FEMALE", "MALE", "UNKNOWN"])
  @IsOptional()
  sex?: string | null;

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

  @IsIn(["SHELTER_VOLUNTEER", "OWNER_SURRENDER", "RESCUE_REQUEST", "VET_CLINIC", "RESCUE_ORGANISATION", "OTHER"])
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
  @IsOptional()
  sterilizationStatus?: string | null;

  @IsString()
  @IsOptional()
  currentLocationId?: string | null;

  toCommand(): UpdateCatCommand {
    if (this.name !== undefined && !this.name.trim())
      throw new BadRequestException("Cat name is required");
    if (
      this.sex !== undefined &&
      (typeof this.sex !== "string" ||
        !["FEMALE", "MALE", "UNKNOWN"].includes(this.sex))
    ) {
      throw new BadRequestException(
        "Invalid sex. Must be one of: FEMALE, MALE, UNKNOWN",
      );
    }
    if (
      this.sterilizationStatus !== undefined &&
      (typeof this.sterilizationStatus !== "string" ||
        !["STERILIZED", "NOT_STERILIZED", "UNKNOWN"].includes(
          this.sterilizationStatus,
        ))
    ) {
      throw new BadRequestException(
        "Invalid sterilizationStatus. Must be one of: STERILIZED, NOT_STERILIZED, UNKNOWN",
      );
    }
    const validIntakeSources = [
      "SHELTER_VOLUNTEER",
      "OWNER_SURRENDER",
      "RESCUE_REQUEST",
      "VET_CLINIC",
      "RESCUE_ORGANISATION",
      "OTHER",
    ];
    if (
      this.intakeSource !== undefined &&
      this.intakeSource !== null &&
      !validIntakeSources.includes(this.intakeSource)
    ) {
      throw new BadRequestException(
        `Invalid intakeSource. Must be one of: ${validIntakeSources.join(", ")}`,
      );
    }
    return {
      ...(this.name !== undefined ? { name: this.name.trim() } : {}),
      ...(this.sex !== undefined
        ? { sex: this.sex as UpdateCatCommand["sex"] }
        : {}),
      ...(this.color !== undefined ? { color: optionalText(this.color) } : {}),
      ...(this.estimatedBirthDate !== undefined
        ? {
            estimatedBirthDate: optionalDate(
              this.estimatedBirthDate,
              "estimatedBirthDate",
            ),
          }
        : {}),
      ...(this.intakeDate !== undefined
        ? { intakeDate: optionalDate(this.intakeDate, "intakeDate") }
        : {}),
      ...(this.intakeDetails !== undefined
        ? { intakeDetails: optionalText(this.intakeDetails) }
        : {}),
      ...(this.intakeSource !== undefined
        ? { intakeSource: this.intakeSource as UpdateCatCommand["intakeSource"] }
        : {}),
      ...(this.microchipNumber !== undefined
        ? { microchipNumber: optionalText(this.microchipNumber) }
        : {}),
      ...(this.passport !== undefined ? { passport: this.passport } : {}),
      ...(this.sponsorName !== undefined
        ? { sponsorName: optionalText(this.sponsorName) }
        : {}),
      ...(this.adopterName !== undefined
        ? { adopterName: optionalText(this.adopterName) }
        : {}),
      ...(this.adopterAddress !== undefined
        ? { adopterAddress: optionalText(this.adopterAddress) }
        : {}),
      ...(this.felvFivTestDone !== undefined
        ? { felvFivTestDone: this.felvFivTestDone }
        : {}),
      ...(this.sterilizationStatus !== undefined
        ? {
            sterilizationStatus: this
              .sterilizationStatus as UpdateCatCommand["sterilizationStatus"],
          }
        : {}),
      ...(this.currentLocationId !== undefined
        ? { currentLocationId: this.currentLocationId || null }
        : {}),
    };
  }
}
