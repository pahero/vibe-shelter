import {
  IsBoolean,
  IsDefined,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";
import { BadRequestException } from "@nestjs/common";

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  role: "admin" | "staff" = "staff";

  @IsString()
  status: "active" | "inactive" = "active";

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

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
  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  role?: "admin" | "staff";

  @IsString()
  @IsOptional()
  status?: "active" | "inactive";

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
  id!: string;

  email!: string;

  fullName!: string | null;

  status!: "active" | "inactive";

  role!: "admin" | "staff";

  isTest!: boolean;

  passwordChangeRequired!: boolean;

  lastLoginAt!: Date | null;

  createdAt!: Date;

  updatedAt!: Date;
}

export class AuthMeDto {
  id!: string;

  email!: string;

  fullName!: string | null;

  role!: "admin" | "staff";

  isTest!: boolean;

  passwordChangeRequired!: boolean;
}

export class PasswordLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  toCommand(): PasswordLoginCommand {
    return { email: this.email.trim().toLowerCase(), password: this.password };
  }
}

export type PasswordLoginCommand = { email: string; password: string };

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;

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
  @IsString()
  @MinLength(8)
  newPassword!: string;

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
