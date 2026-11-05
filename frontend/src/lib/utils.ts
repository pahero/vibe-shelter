import type { DuplicateCatReference } from "@/lib/api";

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export function formatDate(dateString: string): string {
  return dateTimeFormatter.format(new Date(dateString));
}

export function formatDateShort(dateString: string): string {
  return dateFormatter.format(new Date(dateString));
}

export class ApiErrorHandler {
  static handle(error: unknown): string {
    if (error && typeof error === "object" && "message" in error) {
      const message = (error as { message?: unknown }).message;
      return typeof message === "string"
        ? message.replace(/\s*\[duplicateCatId=[^\]]+\]$/, "")
        : "An unexpected error occurred";
    }
    return "An unexpected error occurred";
  }

  static isDuplicateError(error: unknown): boolean {
    if (error && typeof error === "object" && "statusCode" in error) {
      return (error as { statusCode?: unknown }).statusCode === 409;
    }
    return false;
  }

  static getDuplicateCat(error: unknown): DuplicateCatReference | null {
    if (!error || typeof error !== "object") return null;
    const fromMessage = () => {
      const message = "message" in error ? error.message : null;
      if (typeof message !== "string") return null;
      const match = /\[duplicateCatId=([^\]]+)\]/.exec(message);
      return match?.[1]
        ? { id: match[1], name: "existing cat", nameNumber: 1 }
        : null;
    };
    if (!("duplicateCat" in error)) return fromMessage();
    const duplicateCat = error.duplicateCat;
    if (
      !duplicateCat ||
      typeof duplicateCat !== "object" ||
      !("id" in duplicateCat) ||
      typeof duplicateCat.id !== "string" ||
      !("name" in duplicateCat) ||
      typeof duplicateCat.name !== "string" ||
      !("nameNumber" in duplicateCat) ||
      typeof duplicateCat.nameNumber !== "number"
    ) {
      return fromMessage();
    }
    return {
      id: duplicateCat.id,
      name: duplicateCat.name,
      nameNumber: duplicateCat.nameNumber,
    };
  }

  static isValidationError(error: unknown): boolean {
    if (error && typeof error === "object" && "statusCode" in error) {
      return (error as { statusCode?: unknown }).statusCode === 400;
    }
    return false;
  }

  static isNotFoundError(error: unknown): boolean {
    if (error && typeof error === "object" && "statusCode" in error) {
      return (error as { statusCode?: unknown }).statusCode === 404;
    }
    return false;
  }
}
