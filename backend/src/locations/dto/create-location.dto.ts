import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLocationDto {
  @ApiProperty({
    description: 'Location name',
    example: 'Downtown Shelter',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Location description',
    example: 'Main downtown shelter facility',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Location type',
    enum: ['SHELTER', 'CLINIC', 'FOSTER'],
    example: 'SHELTER',
  })
  @IsEnum(['SHELTER', 'CLINIC', 'FOSTER'])
  @IsNotEmpty()
  type!: string;

  @ApiProperty({
    description: 'Owner user ID (for FOSTER locations)',
    required: false,
  })
  @IsString()
  @IsOptional()
  ownerId?: string;
}
