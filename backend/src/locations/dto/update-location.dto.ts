import { IsString, IsOptional, IsEnum } from "class-validator";

export class UpdateLocationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsString()
  @IsOptional()
  ownerId?: string | null;

  @IsEnum(["ACTIVE", "INACTIVE", "ARCHIVED"])
  @IsOptional()
  status?: string;

  toCommand(): {
    name?: string;
    description?: string | null;
    ownerId?: string | null;
    status?: string;
  } {
    return {
      ...(this.name !== undefined ? { name: this.name.trim() } : {}),
      ...(this.description !== undefined
        ? { description: this.description?.trim() || null }
        : {}),
      ...(this.ownerId !== undefined
        ? { ownerId: this.ownerId?.trim() || null }
        : {}),
      ...(this.status !== undefined ? { status: this.status } : {}),
    };
  }
}
