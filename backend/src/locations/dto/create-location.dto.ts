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

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  ownerIds?: string[];

  toCommand(): { name: string; description?: string; ownerIds?: string[] } {
    return {
      name: this.name.trim(),
      ...(this.description !== undefined
        ? { description: this.description.trim() }
        : {}),
      ...(this.ownerIds !== undefined
        ? { ownerIds: this.ownerIds.map((id) => id.trim()) }
        : {}),
    };
  }
}
