import { ForbiddenException } from "@nestjs/common";
import type { Request, Response } from "express";

const ACCESS_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

export function accessCookieName(nodeEnv: string): string {
  return nodeEnv === "production" ? "__Host-session" : "shelter_session";
}

export function refreshCookieName(nodeEnv: string): string {
  return nodeEnv === "production" ? "__Host-refresh" : "shelter_refresh";
}

export function readCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const value = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!value) return null;
  try {
    return decodeURIComponent(value.slice(name.length + 1));
  } catch {
    return null;
  }
}

export function setAuthCookies(response: Response, accessToken: string, refreshToken: string, nodeEnv: string): void {
  const secure = nodeEnv === "production";
  response.cookie(accessCookieName(nodeEnv), accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_COOKIE_MAX_AGE,
  });
  response.cookie(refreshCookieName(nodeEnv), refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
}

export function clearAuthCookies(response: Response, nodeEnv: string): void {
  const options = { httpOnly: true, secure: nodeEnv === "production", sameSite: "lax" as const, path: "/" };
  response.clearCookie(accessCookieName(nodeEnv), options);
  response.clearCookie(refreshCookieName(nodeEnv), options);
}

export function assertSameOrigin(request: Request, frontendUrl: string): void {
  const origin = request.get("origin");
  if (!origin) return;
  try {
    if (new URL(origin).origin === new URL(frontendUrl).origin) return;
  } catch {
    // Invalid Origin headers are rejected below.
  }
  throw new ForbiddenException("Cross-origin request rejected");
}
