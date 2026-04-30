import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Full name of the user', example: 'John Doe', required: false })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({ description: 'User role', enum: ['admin', 'staff'], default: 'staff' })
  @IsString()
  role: 'admin' | 'staff' = 'staff';

  @ApiProperty({ description: 'User account status', enum: ['active', 'inactive'], default: 'active' })
  @IsString()
  status: 'active' | 'inactive' = 'active';

  @ApiProperty({ description: 'Password (min 8 characters)', example: 'SecurePass123', required: false, minLength: 8 })
  @IsString()
  @IsOptional()
  @MinLength(8)
  password?: string;
}

export class UpdateUserDto {
  @ApiProperty({ description: 'Full name of the user', example: 'John Doe', required: false })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({ description: 'User role', enum: ['admin', 'staff'], required: false })
  @IsString()
  @IsOptional()
  role?: 'admin' | 'staff';

  @ApiProperty({ description: 'User account status', enum: ['active', 'inactive'], required: false })
  @IsString()
  @IsOptional()
  status?: 'active' | 'inactive';

  @ApiProperty({ description: 'Password (min 8 characters)', example: 'SecurePass123', required: false, minLength: 8 })
  @IsString()
  @IsOptional()
  @MinLength(8)
  password?: string;
}

export class UserResponseDto {
  @ApiProperty({ description: 'Unique user identifier', example: 'uuid-1234' })
  id!: string;

  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  email!: string;

  @ApiProperty({ description: 'Full name of the user', example: 'John Doe', nullable: true })
  fullName!: string | null;

  @ApiProperty({ description: 'User account status', enum: ['active', 'inactive'] })
  status!: 'active' | 'inactive';

  @ApiProperty({ description: 'User role', enum: ['admin', 'staff'] })
  role!: 'admin' | 'staff';

  @ApiProperty({ description: 'Last login timestamp', nullable: true })
  lastLoginAt!: Date | null;

  @ApiProperty({ description: 'Account creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;
}

export class AuthMeDto {
  @ApiProperty({ description: 'Unique user identifier', example: 'uuid-1234' })
  id!: string;

  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  email!: string;

  @ApiProperty({ description: 'Full name of the user', example: 'John Doe', nullable: true })
  fullName!: string | null;

  @ApiProperty({ description: 'User role', enum: ['admin', 'staff'] })
  role!: 'admin' | 'staff';
}

export class PasswordLoginDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'User password', example: 'SecurePass123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}
