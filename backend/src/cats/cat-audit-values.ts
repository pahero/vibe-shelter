export function formatCatAuditValue(value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  const intakeSourceLabels: Record<string, string> = {
    SHELTER_VOLUNTEER: "FOLC volunteer",
    OWNER_SURRENDER: "Owner Surrender",
    RESCUE_REQUEST: "Rescue request",
    VET_CLINIC: "Vet clinic",
    RESCUE_ORGANISATION: "Rescue organisation",
    FIRST_CONFISCATION: "First confiscation",
    SECOND_CONFISCATION: "Second confiscation",
    ZOI: "Zoi",
    OTHER: "Other",
    DE: "Germany",
    CH: "Switzerland",
  };
  if (typeof value === "string" && value in intakeSourceLabels) {
    return intakeSourceLabels[value];
  }
  return String(value);
}
