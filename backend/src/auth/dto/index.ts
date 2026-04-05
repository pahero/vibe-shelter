import { IsEmail, IsString, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  role: 'admin' | 'staff' = 'staff';

  @IsString()
  status: 'active' | 'inactive' = 'active';
}

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  role?: 'admin' | 'staff';

  @IsString()
  @IsOptional()
  status?: 'active' | 'inactive';
}

export class UserResponseDto {
  id!: string;
  email!: string;
  fullName!: string | null;
  status!: 'active' | 'inactive';
  role!: 'admin' | 'staff';
  lastLoginAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class AuthMeDto {
  id!: string;
  email!: string;
  fullName!: string | null;
  role!: 'admin' | 'staff';
}
