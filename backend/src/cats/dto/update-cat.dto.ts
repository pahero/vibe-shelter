import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateCatDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsIn(['FEMALE', 'MALE', 'UNKNOWN'])
  @IsOptional()
  sex?: string | null;

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

  @IsString()
  @IsOptional()
  adopterName?: string | null;

  @IsString()
  @IsOptional()
  adopterAddress?: string | null;

  @IsBoolean()
  @IsOptional()
  felvFivTestDone?: boolean;

  @IsIn(['STERILIZED', 'NOT_STERILIZED', 'UNKNOWN'])
  @IsOptional()
  sterilizationStatus?: string | null;

  @IsString()
  @IsOptional()
  currentLocationId?: string | null;
}
