import { UnauthorizedException } from "@nestjs/common";
import * as jwt from "jsonwebtoken";

export type JwtUser = Pick<
  Express.User,
  "id" | "email" | "fullName" | "role" | "isTest" | "passwordChangeRequired"
>;

const ACCESS_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

export function signJwt(user: JwtUser, secret: string, now = Date.now()): string {
  if (!secret) throw new Error("JWT_SECRET must be configured");
  return jwt.sign(
    { ...user, iat: Math.floor(now / 1000) },
    secret,
    { algorithm: "HS256", expiresIn: ACCESS_TOKEN_TTL_SECONDS },
  );
}

export function verifyJwt(token: string, secret: string, now = Date.now()): JwtUser {
  try {
    if (!secret) throw new Error("JWT_SECRET must be configured");
    const decoded: unknown = jwt.verify(token, secret, {
      algorithms: ["HS256"],
      clockTimestamp: Math.floor(now / 1000),
    });
    if (!isJwtUser(decoded)) throw new Error("Invalid JWT claims");
    return {
      id: decoded.id,
      email: decoded.email,
      fullName: decoded.fullName,
      role: decoded.role,
      isTest: decoded.isTest,
      passwordChangeRequired: decoded.passwordChangeRequired,
    };
  } catch {
    throw new UnauthorizedException("Invalid or expired bearer token");
  }
}

function isJwtUser(value: unknown): value is JwtUser & { exp: number } {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.id === "string" &&
    typeof payload.email === "string" &&
    (payload.role === "ADMIN" || payload.role === "STAFF") &&
    typeof payload.isTest === "boolean" &&
    typeof payload.passwordChangeRequired === "boolean" &&
    (payload.fullName === null || typeof payload.fullName === "string") &&
    typeof payload.exp === "number"
  );
}
