import { IsNumber, IsString, Min } from 'class-validator';

export class CreateCatWeightDto {
  @IsNumber()
  @Min(0.01)
  weightKg!: number;

  @IsString()
  measuredAt!: string;
}
