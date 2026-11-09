import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ArrayUnique,
  ValidateIf,
} from "class-validator";

export class UpdateLocationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  ownerIds?: string[];

  @IsEnum(["ACTIVE", "INACTIVE", "ARCHIVED"])
  @IsOptional()
  status?: string;

  toCommand(): {
    name?: string;
    description?: string | null;
    ownerIds?: string[];
    status?: string;
  } {
    return {
      ...(this.name !== undefined ? { name: this.name.trim() } : {}),
      ...(this.description !== undefined
        ? { description: this.description?.trim() || null }
        : {}),
      ...(this.ownerIds !== undefined
        ? { ownerIds: this.ownerIds.map((id) => id.trim()) }
        : {}),
      ...(this.status !== undefined ? { status: this.status } : {}),
    };
  }
}
