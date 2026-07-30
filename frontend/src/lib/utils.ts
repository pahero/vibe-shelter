const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
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
      return typeof message === "string" ? message : "An unexpected error occurred";
    }
    return "An unexpected error occurred";
  }

  static isDuplicateError(error: unknown): boolean {
    if (error && typeof error === "object" && "statusCode" in error) {
      return (error as { statusCode?: unknown }).statusCode === 409;
    }
    return false;
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
