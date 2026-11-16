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

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  ownerIds?: string[];

  @IsEnum(["ACTIVE", "INACTIVE", "ARCHIVED"])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  parentId?: string | null;

  toCommand(): {
    name?: string;
    ownerIds?: string[];
    status?: string;
    parentId?: string | null;
  } {
    return {
      ...(this.name !== undefined ? { name: this.name.trim() } : {}),
      ...(this.ownerIds !== undefined
        ? { ownerIds: this.ownerIds.map((id) => id.trim()) }
        : {}),
      ...(this.status !== undefined ? { status: this.status } : {}),
      ...(this.parentId !== undefined
        ? { parentId: this.parentId?.trim() || null }
        : {}),
    };
  }
}
