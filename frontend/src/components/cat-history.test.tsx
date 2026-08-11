import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CatHistory } from "./cat-history";
import { CatHistoryEvent } from "@/lib/api";

const baseEvent = {
  id: "event-1",
  catId: "cat-1",
  occurredAt: "2026-08-10T12:00:00.000Z",
  actor: { id: "user-1", displayName: "Staff Member", email: "staff@example.com" },
} satisfies Partial<CatHistoryEvent>;

describe("CatHistory", () => {
  it("renders loading, empty, and error states", () => {
    const { rerender } = render(<CatHistory events={[]} isLoading error={null} />);
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

    expect(screen.getByText("Name changed")).toBeVisible();
    expect(screen.getByText("By Staff Member")).toBeVisible();
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

    expect(screen.getByText("Photo added")).toBeVisible();
    expect(screen.getByText("Photo deleted")).toBeVisible();
    expect(screen.getByRole("link", { name: "Open photo link" })).toHaveAttribute("href", "https://example.test/photo-1");
    expect(screen.getByRole("link", { name: "Open historical deleted-photo link" })).toHaveAttribute("href", "https://example.test/photo-1");
  });
});
