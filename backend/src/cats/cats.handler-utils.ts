import { BadRequestException } from "@nestjs/common";
import { CreateCatWeightCommand } from "./dto/create-cat-weight.dto";
import { UpdateCatCommand } from "./dto/update-cat.dto";
import {
  CAT_AUDIT_EDITABLE_FIELDS,
  CAT_AUDIT_FIELD_EVENT_TYPES,
} from "./cat-audit-event-types";
import { formatCatAuditValue } from "./cat-audit-values";
import { CatWithLocation } from "./cats.types";

const VALID_TAG_COLORS = [
  "#ffb38a",
  "#f5a3ad",
  "#ffd166",
  "#9ee6a8",
  "#8ecaff",
  "#b8a7ff",
  "#eda6f0",
  "#95d8c8",
  "#ffd6a5",
  "#f7e36d",
  "#caffbf",
  "#9bf6ff",
  "#a0c4ff",
  "#bdb2ff",
  "#ffc6ff",
  "#e7c6ff",
  "#cdeac0",
  "#f2a7b7",
  "#bde0fe",
  "#d8b996",
] as const;

export function validateCatId(id: string, label = "Cat ID"): void {
  if (!id?.trim()) throw new BadRequestException(`${label} is required`);
}

export function toCatUpdateData(data: UpdateCatCommand) {
  return {
    ...(data.name !== undefined ? { name: data.name.trim() } : {}),
    ...(data.sex !== undefined
      ? { sex: data.sex as "FEMALE" | "MALE" | "UNKNOWN" }
      : {}),
    ...(data.color !== undefined ? { color: optionalTrim(data.color) } : {}),
    ...(data.estimatedBirthDate !== undefined
      ? { estimatedBirthDate: data.estimatedBirthDate }
      : {}),
    ...(data.intakeDate !== undefined ? { intakeDate: data.intakeDate } : {}),
    ...(data.rescueSource !== undefined
      ? { rescueSource: optionalTrim(data.rescueSource) }
      : {}),
    ...(data.microchipNumber !== undefined
      ? { microchipNumber: optionalTrim(data.microchipNumber) }
      : {}),
    ...(data.passportNumber !== undefined
      ? { passportNumber: optionalTrim(data.passportNumber) }
      : {}),
    ...(data.adopterName !== undefined
      ? { adopterName: optionalTrim(data.adopterName) }
      : {}),
    ...(data.adopterAddress !== undefined
      ? { adopterAddress: optionalTrim(data.adopterAddress) }
      : {}),
    ...(data.felvFivTestDone !== undefined
      ? { felvFivTestDone: data.felvFivTestDone }
      : {}),
    ...(data.sterilizationStatus !== undefined
      ? {
          sterilizationStatus: data.sterilizationStatus as
            | "STERILIZED"
            | "NOT_STERILIZED"
            | "UNKNOWN",
        }
      : {}),
    ...(data.currentLocationId !== undefined
      ? { currentLocationId: data.currentLocationId || null }
      : {}),
  };
}

export function toCatFieldAuditEvents(
  existing: CatWithLocation,
  updateData: ReturnType<typeof toCatUpdateData>,
  actorUserId: string,
) {
  return CAT_AUDIT_EDITABLE_FIELDS.flatMap((field) => {
    if (!(field in updateData)) return [];
    const oldValue = formatCatAuditValue(existing[field]);
    const newValue = formatCatAuditValue(
      updateData[field as keyof typeof updateData],
    );
    if (oldValue === newValue) return [];
    return [
      {
        catId: existing.id,
        actorUserId,
        eventType: CAT_AUDIT_FIELD_EVENT_TYPES[field],
        oldValue: oldValue ?? "Not set",
        newValue: newValue ?? "Not set",
      },
    ];
  });
}

export function validateCatUpdate(data: UpdateCatCommand): void {
  if (
    data.name !== undefined &&
    (typeof data.name !== "string" || !data.name.trim())
  )
    throw new BadRequestException("Cat name is required");
  if (
    data.estimatedBirthDate instanceof Date &&
    Number.isNaN(data.estimatedBirthDate.getTime())
  )
    throw new BadRequestException("estimatedBirthDate must be a valid date");
  if (
    data.intakeDate instanceof Date &&
    Number.isNaN(data.intakeDate.getTime())
  )
    throw new BadRequestException("intakeDate must be a valid date");
}

function validateWeight(value: number): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0)
    throw new BadRequestException("weightKg must be a positive number");
}

export function validateTagName(value: string | undefined): string {
  const name = value?.trim();
  if (!name) throw new BadRequestException("Tag name is required");
  if (name.length > 40)
    throw new BadRequestException("Tag name must be at most 40 characters");
  return name;
}

export function validateTagColor(value: string | undefined): string {
  const color = (value?.trim() || VALID_TAG_COLORS[0]).toLowerCase();
  if (!VALID_TAG_COLORS.includes(color as (typeof VALID_TAG_COLORS)[number]))
    throw new BadRequestException(
      "Tag color must be one of the allowed colors",
    );
  return color;
}

export function validateWeightCommand(data: CreateCatWeightCommand): Date {
  validateWeight(data.weightKg);
  if (Number.isNaN(data.measuredAt.getTime()))
    throw new BadRequestException("measuredAt must be a valid date");
  return data.measuredAt;
}

function optionalTrim(value?: string | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
