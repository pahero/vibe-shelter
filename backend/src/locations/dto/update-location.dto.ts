import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateLocationDto {
  @ApiProperty({
    description: 'Location name',
    example: 'Downtown Shelter Updated',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Location description',
    example: 'Updated description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string | null;

  @ApiProperty({
    description: 'Owner user ID',
    required: false,
    nullable: true,
  })
  @IsString()
  @IsOptional()
  ownerId?: string | null;

  @ApiProperty({
    description: 'Location status',
    enum: ['ACTIVE', 'INACTIVE', 'ARCHIVED'],
    required: false,
  })
  @IsEnum(['ACTIVE', 'INACTIVE', 'ARCHIVED'])
  @IsOptional()
  status?: string;
}
