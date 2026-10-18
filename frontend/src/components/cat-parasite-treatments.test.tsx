import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { catsApi } from "@/lib/api";
import { CatParasiteTreatments } from "./cat-parasite-treatments";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, catsApi: { ...actual.catsApi, listParasiteTreatments: vi.fn(), createParasiteTreatment: vi.fn(), updateParasiteTreatment: vi.fn(), deleteParasiteTreatment: vi.fn() } };
});

const list = vi.mocked(catsApi.listParasiteTreatments);
const create = vi.mocked(catsApi.createParasiteTreatment);

describe("CatParasiteTreatments", () => {
  beforeEach(() => {
    list.mockReset().mockResolvedValue([]);
    create.mockReset().mockResolvedValue({ id: "parasite-1" });
    vi.mocked(catsApi.updateParasiteTreatment).mockReset();
    vi.mocked(catsApi.deleteParasiteTreatment).mockReset();
  });

  it("offers separate treatment types and requires a product name", async () => {
    render(<CatParasiteTreatments catId="cat-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Parasite treatments" }));
    await screen.findByText("No parasite treatments recorded.");
    fireEvent.click(screen.getByRole("button", { name: "Add parasite treatment" }));
    expect(screen.getByLabelText("Treatment Type").querySelectorAll("option")).toHaveLength(4);
    expect(screen.getByLabelText("Parasite treatment date")).toBeRequired();
    expect(screen.getByLabelText("Product Name")).toBeRequired();
    expect(screen.getByLabelText("Parasite treatment next due date")).not.toBeRequired();
  });

  it("submits parasite-treatment fields with a trimmed product name", async () => {
    render(<CatParasiteTreatments catId="cat-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Parasite treatments" }));
    await screen.findByText("No parasite treatments recorded.");
    fireEvent.click(screen.getByRole("button", { name: "Add parasite treatment" }));
    fireEvent.change(screen.getByLabelText("Product Name"), { target: { value: "  Spot-on  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(create).toHaveBeenCalledWith("cat-1", expect.objectContaining({ type: "FLEAS_TICKS", productName: "Spot-on", nextDueDate: null })));
  });
});
