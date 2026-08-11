export function formatCatAuditValue(value: unknown): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}
