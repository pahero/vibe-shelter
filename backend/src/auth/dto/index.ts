import {
  IsBoolean,
  IsDefined,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { BadRequestException } from "@nestjs/common";

export class CreateUserDto {
  @ApiProperty({
    description: "User email address",
    example: "user@example.com",
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: "Full name of the user",
    example: "John Doe",
    required: false,
  })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({
    description: "User role",
    enum: ["admin", "staff"],
    default: "staff",
  })
  @IsString()
  role: "admin" | "staff" = "staff";

  @ApiProperty({
    description: "User account status",
    enum: ["active", "inactive"],
    default: "active",
  })
  @IsString()
  status: "active" | "inactive" = "active";

  @ApiProperty({
    description: "Password (min 8 characters)",
    example: "SecurePass123",
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @ApiProperty({
    description: "Whether this user is a test user marker",
    example: false,
  })
  @IsDefined()
  @IsBoolean()
  isTest!: boolean;

  toCommand(): CreateUserCommand {
    return {
      email: this.email.trim().toLowerCase(),
      fullName: this.fullName?.trim(),
      role: this.role,
      status: this.status,
      password: this.password,
      isTest: this.isTest,
    };
  }
}

export type CreateUserCommand = {
  email: string;
  fullName?: string;
  role: "admin" | "staff";
  status: "active" | "inactive";
  password: string;
  isTest: boolean;
};

export class UpdateUserDto {
  @ApiProperty({
    description: "Full name of the user",
    example: "John Doe",
    required: false,
  })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({
    description: "User role",
    enum: ["admin", "staff"],
    required: false,
  })
  @IsString()
  @IsOptional()
  role?: "admin" | "staff";

  @ApiProperty({
    description: "User account status",
    enum: ["active", "inactive"],
    required: false,
  })
  @IsString()
  @IsOptional()
  status?: "active" | "inactive";

  @ApiProperty({
    description: "Password (min 8 characters)",
    example: "SecurePass123",
    required: false,
    minLength: 8,
  })
  @IsString()
  @IsOptional()
  @MinLength(8)
  password?: string;

  toCommand(): UpdateUserCommand {
    return {
      ...(this.fullName !== undefined
        ? { fullName: this.fullName.trim() }
        : {}),
      ...(this.role !== undefined ? { role: this.role } : {}),
      ...(this.status !== undefined ? { status: this.status } : {}),
      ...(this.password !== undefined ? { password: this.password } : {}),
    };
  }
}

export type UpdateUserCommand = {
  fullName?: string;
  role?: "admin" | "staff";
  status?: "active" | "inactive";
  password?: string;
};

export class UserResponseDto {
  @ApiProperty({ description: "Unique user identifier", example: "uuid-1234" })
  id!: string;

  @ApiProperty({
    description: "User email address",
    example: "user@example.com",
  })
  email!: string;

  @ApiProperty({
    description: "Full name of the user",
    example: "John Doe",
    nullable: true,
  })
  fullName!: string | null;

  @ApiProperty({
    description: "User account status",
    enum: ["active", "inactive"],
  })
  status!: "active" | "inactive";

  @ApiProperty({ description: "User role", enum: ["admin", "staff"] })
  role!: "admin" | "staff";

  @ApiProperty({ description: "Whether this user is marked as a test user" })
  isTest!: boolean;

  @ApiProperty({
    description: "Whether the user must replace a temporary password",
  })
  passwordChangeRequired!: boolean;

  @ApiProperty({ description: "Last login timestamp", nullable: true })
  lastLoginAt!: Date | null;

  @ApiProperty({ description: "Account creation timestamp" })
  createdAt!: Date;

  @ApiProperty({ description: "Last update timestamp" })
  updatedAt!: Date;
}

export class AuthMeDto {
  @ApiProperty({ description: "Unique user identifier", example: "uuid-1234" })
  id!: string;

  @ApiProperty({
    description: "User email address",
    example: "user@example.com",
  })
  email!: string;

  @ApiProperty({
    description: "Full name of the user",
    example: "John Doe",
    nullable: true,
  })
  fullName!: string | null;

  @ApiProperty({ description: "User role", enum: ["admin", "staff"] })
  role!: "admin" | "staff";

  @ApiProperty({ description: "Whether this user is marked as a test user" })
  isTest!: boolean;

  @ApiProperty({
    description: "Whether the user must replace a temporary password",
  })
  passwordChangeRequired!: boolean;
}

export class PasswordLoginDto {
  @ApiProperty({
    description: "User email address",
    example: "user@example.com",
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: "User password",
    example: "SecurePass123",
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password!: string;

  toCommand(): PasswordLoginCommand {
    return { email: this.email.trim().toLowerCase(), password: this.password };
  }
}

export type PasswordLoginCommand = { email: string; password: string };

export class ChangePasswordDto {
  @ApiProperty({
    description: "Current password",
    example: "CurrentPass123!",
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({
    description: "New password",
    example: "NewPass123!",
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  newPassword!: string;

  @ApiProperty({
    description: "Repeated new password",
    example: "NewPass123!",
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  newPasswordConfirmation!: string;

  toCommand(userId: string): ChangePasswordCommand {
    if (this.newPassword !== this.newPasswordConfirmation)
      throw new BadRequestException("New passwords do not match");
    return {
      userId,
      currentPassword: this.currentPassword,
      newPassword: this.newPassword,
    };
  }
}

export type ChangePasswordCommand = {
  userId: string;
  currentPassword: string;
  newPassword: string;
};

export class ReplaceTemporaryPasswordDto {
  @ApiProperty({
    description: "New password",
    example: "NewPass123!",
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  newPassword!: string;

  @ApiProperty({
    description: "Repeated new password",
    example: "NewPass123!",
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  newPasswordConfirmation!: string;

  toCommand(userId: string): ReplaceTemporaryPasswordCommand {
    if (this.newPassword !== this.newPasswordConfirmation)
      throw new BadRequestException("New passwords do not match");
    return { userId, newPassword: this.newPassword };
  }
}

export type ReplaceTemporaryPasswordCommand = {
  userId: string;
  newPassword: string;
};
