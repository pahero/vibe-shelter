import { IsString, IsNotEmpty, IsOptional } from "class-validator";

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  ownerId?: string;

  toCommand(): { name: string; description?: string; ownerId?: string } {
    return {
      name: this.name.trim(),
      ...(this.description !== undefined
        ? { description: this.description.trim() }
        : {}),
      ...(this.ownerId !== undefined ? { ownerId: this.ownerId.trim() } : {}),
    };
  }
}
