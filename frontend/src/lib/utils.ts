export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export class ApiErrorHandler {
  static handle(error: unknown): string {
    if (error && typeof error === "object" && "message" in error) {
      return (error as any).message;
    }
    return "An unexpected error occurred";
  }

  static isDuplicateError(error: unknown): boolean {
    if (error && typeof error === "object" && "statusCode" in error) {
      return (error as any).statusCode === 409;
    }
    return false;
  }

  static isValidationError(error: unknown): boolean {
    if (error && typeof error === "object" && "statusCode" in error) {
      return (error as any).statusCode === 400;
    }
    return false;
  }

  static isNotFoundError(error: unknown): boolean {
    if (error && typeof error === "object" && "statusCode" in error) {
      return (error as any).statusCode === 404;
    }
    return false;
  }
}
