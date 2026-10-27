export function formatCatAuditValue(value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  const intakeSourceLabels: Record<string, string> = {
    SHELTER_VOLUNTEER: "Shelter volunteer",
    OWNER_SURRENDER: "Owner Surrender",
    RESCUE_REQUEST: "Rescue request",
    VET_CLINIC: "Vet clinic",
    RESCUE_ORGANISATION: "Rescue organisation",
    OTHER: "Other",
  };
  if (typeof value === "string" && value in intakeSourceLabels) {
    return intakeSourceLabels[value];
  }
  return String(value);
}
