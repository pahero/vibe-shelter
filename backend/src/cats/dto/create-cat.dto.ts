import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCatDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsIn(['FEMALE', 'MALE', 'UNKNOWN'])
  sex!: string;

  @IsString()
  @IsOptional()
  color?: string | null;

  @IsString()
  @IsOptional()
  estimatedBirthDate?: string | null;

  @IsString()
  @IsOptional()
  intakeDate?: string | null;

  @IsString()
  @IsOptional()
  rescueSource?: string | null;

  @IsString()
  @IsOptional()
  microchipNumber?: string | null;

  @IsString()
  @IsOptional()
  passportNumber?: string | null;

  @IsIn(['STERILIZED', 'NOT_STERILIZED', 'UNKNOWN'])
  sterilizationStatus!: string;

  @IsString()
  @IsOptional()
  currentLocationId?: string | null;
}
