import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { BadRequestException } from '@nestjs/common';

export type CreateCatTagCommand = { name: string; color?: string };
export type UpdateCatTagCommand = { name?: string; color?: string };

export class CreateCatTagDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  color?: string;

  toCommand(): CreateCatTagCommand {
    const name = this.name?.trim();
    if (!name) throw new BadRequestException('Tag name is required');
    return { name, ...(this.color !== undefined ? { color: this.color.trim().toLowerCase() } : {}) };
  }
}

export class UpdateCatTagDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  color?: string;

  toCommand(): UpdateCatTagCommand {
    return {
      ...(this.name !== undefined ? { name: this.name.trim() } : {}),
      ...(this.color !== undefined ? { color: this.color.trim().toLowerCase() } : {}),
    };
  }
}
