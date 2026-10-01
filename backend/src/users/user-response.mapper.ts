import { User } from "@prisma/client";
import { UserResponseDto } from "../auth/dto";

export function toUserResponse(user: User): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    status: user.status.toLowerCase() as "active" | "inactive",
    role: user.role.toLowerCase() as "admin" | "staff",
    isTest: user.isTest,
    passwordChangeRequired: user.passwordChangeRequired,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
