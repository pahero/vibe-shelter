import { describe, expect, it } from "vitest";
import { formatCatAuditValue } from "./cat-audit-values";

describe("formatCatAuditValue", () => {
  it.each([
    ["FIRST_CONFISCATION", "First confiscation"],
    ["SECOND_CONFISCATION", "Second confiscation"],
    ["ZOI", "Zoi"],
    ["DE", "Germany"],
    ["CH", "Switzerland"],
  ])("formats %s as %s", (value, expected) => {
    expect(formatCatAuditValue(value)).toBe(expected);
  });
});
