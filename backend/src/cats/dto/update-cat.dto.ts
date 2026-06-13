import { IsIn, IsOptional, IsString } from 'class-validator';

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

  @IsIn(['STERILIZED', 'NOT_STERILIZED', 'UNKNOWN'])
  @IsOptional()
  sterilizationStatus?: string | null;

  @IsIn(['ACTIVE', 'ADOPTED', 'DECEASED', 'ARCHIVED'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  currentLocationId?: string | null;
}
