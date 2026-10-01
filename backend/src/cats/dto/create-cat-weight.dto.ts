import { IsNumber, IsString, Min } from 'class-validator';
import { BadRequestException } from '@nestjs/common';

export type CreateCatWeightCommand = { weightKg: number; measuredAt: Date };

export class CreateCatWeightDto {
  @IsNumber()
  @Min(0.01)
  weightKg!: number;

  @IsString()
  measuredAt!: string;

  toCommand(): CreateCatWeightCommand {
    if (!this.measuredAt) throw new BadRequestException('measuredAt is required');
    const measuredAt = new Date(this.measuredAt);
    if (Number.isNaN(measuredAt.getTime())) throw new BadRequestException('measuredAt must be a valid date');
    return { weightKg: this.weightKg, measuredAt };
  }
}
