import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { auditEventStyle, CatHistory } from "./cat-history";
import { CatHistoryEvent } from "@/lib/api";

const baseEvent = {
  id: "event-1",
  catId: "cat-1",
  occurredAt: "2026-08-10T12:00:00.000Z",
  actor: { id: "user-1", displayName: "Staff Member", email: "staff@example.com" },
} satisfies Partial<CatHistoryEvent>;

describe("CatHistory", () => {
  it("uses green, amber, and red styles for create, edit, and delete events", () => {
    expect(auditEventStyle("treatment_created")).toContain("border-l-[#31734b]");
    expect(auditEventStyle("treatment_short_name_changed")).toContain("border-l-amber-600");
    expect(auditEventStyle("treatment_deleted")).toContain("border-l-red-700");
  });

  it("renders loading, empty, and error states", () => {
    const { rerender } = render(<CatHistory events={[]} isLoading error={null} />);
    expect(screen.queryByText("Loading cat history...")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /audit/i }));
    expect(screen.getByText("Loading cat history...")).toBeVisible();

    rerender(<CatHistory events={[]} isLoading={false} error={null} />);
    expect(screen.getByText("No changes have been recorded for this cat yet.")).toBeVisible();

    rerender(<CatHistory events={[]} isLoading={false} error="Could not load history" />);
    expect(screen.getByText("Could not load history")).toBeVisible();
  });

  it("renders populated field-change history with old and new values", () => {
    render(<CatHistory events={[{
      ...baseEvent,
      eventType: "name_changed",
      oldValue: "Mila",
      newValue: "Luna",
      photo: null,
    } as CatHistoryEvent]} isLoading={false} error={null} />);

    fireEvent.click(screen.getByRole("button", { name: /audit/i }));
    expect(screen.getByText("Name changed")).toBeVisible();
    expect(screen.getByText(/by Staff Member/)).toBeVisible();
    expect(screen.getByText(/Mila/)).toBeVisible();
    expect(screen.getByText(/Luna/)).toBeVisible();
  });

  it("renders photo-created and photo-deleted events with links", () => {
    render(<CatHistory events={[
      {
        ...baseEvent,
        id: "photo-created",
        eventType: "photo_created",
        oldValue: null,
        newValue: null,
        photo: { id: "photo-1", link: "https://example.test/photo-1", status: "ACTIVE" },
      } as CatHistoryEvent,
      {
        ...baseEvent,
        id: "photo-deleted",
        eventType: "photo_deleted",
        oldValue: null,
        newValue: null,
        photo: { id: "photo-1", link: "https://example.test/photo-1", status: "DELETED" },
      } as CatHistoryEvent,
    ]} isLoading={false} error={null} />);

    fireEvent.click(screen.getByRole("button", { name: /audit/i }));
    expect(screen.getByText("Photo added")).toBeVisible();
    expect(screen.getByText("Photo deleted")).toBeVisible();
    expect(screen.getByRole("link", { name: "Open photo link" })).toHaveAttribute("href", "https://example.test/photo-1");
    expect(screen.getByRole("link", { name: "Open historical deleted-photo link" })).toHaveAttribute("href", "https://example.test/photo-1");
  });

  it("renders tag assignment audit events with readable labels", () => {
    render(<CatHistory events={[
      {
        ...baseEvent,
        id: "tag-added",
        eventType: "tag_added_to_cat",
        oldValue: null,
        newValue: "Needs foster",
        photo: null,
      } as CatHistoryEvent,
      {
        ...baseEvent,
        id: "tag-removed",
        eventType: "tag_removed_from_cat",
        oldValue: "Needs foster",
        newValue: null,
        photo: null,
      } as CatHistoryEvent,
    ]} isLoading={false} error={null} />);

    fireEvent.click(screen.getByRole("button", { name: /audit/i }));
    expect(screen.getByText("Tag added")).toBeVisible();
    expect(screen.getByText("Tag removed")).toBeVisible();
  });

  it("shows next-page controls when more audit events are available", () => {
    const onPageChange = vi.fn();
    render(<CatHistory events={[{ ...baseEvent, eventType: "name_changed", oldValue: "A", newValue: "B", photo: null } as CatHistoryEvent]} isLoading={false} error={null} total={51} skip={0} limit={50} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole("button", { name: /audit/i }));
    expect(screen.getByText("Showing 1-50 of 51")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenCalledWith(50);
  });

  it("identifies a treatment audit event by its linked treatment", () => {
    render(<CatHistory events={[{ ...baseEvent, eventType: "treatment_start_date_changed", oldValue: "2026-09-01", newValue: "2026-09-02", treatment: { id: "treatment-1", shortName: "Antibiotic" }, photo: null } as CatHistoryEvent]} isLoading={false} error={null} />);
    fireEvent.click(screen.getByRole("button", { name: /audit/i }));
    expect(screen.getByText("Treatment Antibiotic Start date changed")).toBeVisible();
  });

  it("restores a deleted linked treatment from its audit event", async () => {
    const onRestoreTreatment = vi.fn().mockResolvedValue(undefined);
    render(<CatHistory events={[{ ...baseEvent, eventType: "treatment_deleted", oldValue: null, newValue: null, treatment: { id: "treatment-1", shortName: "Antibiotic", isDeleted: true }, photo: null } as CatHistoryEvent]} isLoading={false} error={null} onRestoreTreatment={onRestoreTreatment} />);
    fireEvent.click(screen.getByRole("button", { name: /audit/i }));
    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    await waitFor(() => expect(onRestoreTreatment).toHaveBeenCalledWith("treatment-1"));
  });

  it("hides Restore after the linked treatment is restored", () => {
    render(<CatHistory events={[{ ...baseEvent, eventType: "treatment_deleted", oldValue: null, newValue: null, treatment: { id: "treatment-1", shortName: "Antibiotic", isDeleted: false }, photo: null } as CatHistoryEvent]} isLoading={false} error={null} onRestoreTreatment={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /audit/i }));
    expect(screen.queryByRole("button", { name: "Restore" })).not.toBeInTheDocument();
  });
});
