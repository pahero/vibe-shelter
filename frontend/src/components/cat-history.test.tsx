import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { auditEventLabel, auditEventStyle, CatHistory } from "./cat-history";
import { CatHistoryEvent } from "@/lib/api";

const event: CatHistoryEvent = {
  id: "event-1",
  catId: "cat-1",
  catName: "Mila",
  eventType: "name_changed",
  occurredAt: "2026-08-10T12:00:00.000Z",
  actorId: "user-1",
  actorFullName: "Staff Member",
  oldValue: "Mila",
  newValue: "Luna",
};

describe("CatHistory", () => {
  it("styles lifecycle, edit, and delete events", () => {
    expect(auditEventStyle("treatment_created")).toContain(
      "border-l-[#31734b]",
    );
    expect(auditEventStyle("treatment_short_name_changed")).toContain(
      "border-l-amber-600",
    );
    expect(auditEventStyle("treatment_deleted")).toContain("border-l-red-700");
  });

  it("renders shared flattened audit events", () => {
    render(
      <CatHistory
        events={[event]}
        isLoading={false}
        error={null}
        showCatName
      />,
    );
    expect(screen.getByText("name changed")).toBeVisible();
    expect(screen.getByText(/on Mila by Staff Member/)).toBeVisible();
    expect(screen.getByText(/Mila.*Luna/)).toBeVisible();
  });

  it("renders linked-file access", () => {
    render(
      <CatHistory
        events={[
          { ...event, fileId: "file-1", fileUrl: "https://example.test/file" },
        ]}
        isLoading={false}
        error={null}
      />,
    );
    expect(
      screen.getByRole("link", { name: "Open linked file" }),
    ).toHaveAttribute("href", "https://example.test/file");
  });

  it("paginates shared history", () => {
    const onPageChange = vi.fn();
    render(
      <CatHistory
        events={[event]}
        isLoading={false}
        error={null}
        total={51}
        onPageChange={onPageChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenCalledWith(50);
  });

  it("labels linked flight records", () => {
    expect(
      auditEventLabel({
        ...event,
        eventType: "flight_created",
        flightId: "flight-1",
        flightNumber: "CY123",
      }),
    ).toBe("Flight CY123 · Flight created");
  });
});
