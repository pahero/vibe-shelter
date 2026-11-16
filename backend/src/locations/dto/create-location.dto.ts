import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ArrayUnique,
  ValidateIf,
} from "class-validator";

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  ownerIds?: string[];

  @IsString()
  @IsOptional()
  parentId?: string | null;

  toCommand(): {
    name: string;
    ownerIds?: string[];
    parentId?: string | null;
  } {
    return {
      name: this.name.trim(),
      ...(this.ownerIds !== undefined
        ? { ownerIds: this.ownerIds.map((id) => id.trim()) }
        : {}),
      ...(this.parentId !== undefined
        ? { parentId: this.parentId?.trim() || null }
        : {}),
    };
  }
}
