import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { catsApi, type CatTreatment } from "@/lib/api";
import { MyTreatmentsClient } from "./my-treatments-client";

vi.mock("next/link", () => ({ default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...props}>{children}</a> }));

const treatment = (id: string, today: string): CatTreatment => ({ id, shortName: "Medicine", instructions: null, startDate: today, endDate: null, dosesPerDay: 1, createdAt: today, updatedAt: today, administrations: [] });

afterEach(() => vi.restoreAllMocks());

describe("MyTreatmentsClient", () => {
  it("loads cats from the favorite-active endpoint and renders the detail-page checkbox table", async () => {
    const today = new Date().toISOString().slice(0, 10);
    vi.spyOn(catsApi, "listFavoriteCatsWithActiveTreatments").mockResolvedValue([
      { id: "cat-new", name: "New", nameNumber: 2, updatedAt: "2026-10-02T00:00:00.000Z" },
      { id: "cat-old", name: "Old", nameNumber: 1, updatedAt: "2026-10-01T00:00:00.000Z" },
    ]);
    vi.spyOn(catsApi, "listTreatments").mockImplementation(async (id) => [treatment(`treatment-${id}`, today)]);
    const setAdministration = vi.spyOn(catsApi, "setTreatmentAdministration").mockResolvedValue({ id: "administration" });
    render(<MyTreatmentsClient />);

    const firstCat = await screen.findByRole("button", { name: "New #2" });
    expect(firstCat).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Old #1" })).toBeVisible();
    expect(await screen.findByRole("checkbox", { name: `Medicine ${today} dose 1` })).toBeVisible();
    fireEvent.click(screen.getByRole("checkbox", { name: `Medicine ${today} dose 1` }));
    await waitFor(() => expect(setAdministration).toHaveBeenCalledWith("treatment-cat-new", today, 1, true));
    expect(catsApi.listFavoriteCatsWithActiveTreatments).toHaveBeenCalledOnce();
  });

  it("shows the requested empty state when no favorite cats have active treatments", async () => {
    vi.spyOn(catsApi, "listFavoriteCatsWithActiveTreatments").mockResolvedValue([]);
    const listTreatments = vi.spyOn(catsApi, "listTreatments");
    render(<MyTreatmentsClient />);
    expect(await screen.findByText("You don't have favorite cats with active treatments")).toBeVisible();
    expect(listTreatments).not.toHaveBeenCalled();
  });

  it("reports a loading failure from the favorite cats endpoint", async () => {
    vi.spyOn(catsApi, "listFavoriteCatsWithActiveTreatments").mockRejectedValue(new Error("offline"));
    render(<MyTreatmentsClient />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load treatments");
  });
});
