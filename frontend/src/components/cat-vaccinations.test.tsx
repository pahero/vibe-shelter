import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { catsApi } from "@/lib/api";
import { CatVaccinations } from "./cat-vaccinations";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, catsApi: { ...actual.catsApi, listVaccinations: vi.fn(), createVaccination: vi.fn(), updateVaccination: vi.fn(), deleteVaccination: vi.fn() } };
});

const list = vi.mocked(catsApi.listVaccinations);
const create = vi.mocked(catsApi.createVaccination);

describe("CatVaccinations", () => {
  beforeEach(() => {
    list.mockReset().mockResolvedValue([]);
    create.mockReset().mockResolvedValue({ id: "vax-1" });
    vi.mocked(catsApi.updateVaccination).mockReset();
    vi.mocked(catsApi.deleteVaccination).mockReset();
  });

  it("offers the three vaccination types and optional fields", async () => {
    render(<CatVaccinations catId="cat-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Vaccinations" }));
    await screen.findByText("No vaccinations recorded.");
    fireEvent.click(screen.getByRole("button", { name: "Add vaccination" }));
    expect(screen.getByLabelText("Vaccine Type")).toBeInTheDocument();
    expect(screen.getByLabelText("Vaccine Type").querySelectorAll("option")).toHaveLength(3);
    expect(screen.getByLabelText("Vaccination next due date")).not.toBeRequired();
    expect(screen.getByLabelText("Vaccine Name")).not.toBeRequired();
    expect(screen.getByLabelText("Vaccination date")).toBeRequired();
  });

  it("submits vaccination fields and refreshes the history callback", async () => {
    const onChanged = vi.fn().mockResolvedValue(undefined);
    render(<CatVaccinations catId="cat-1" onChanged={onChanged} />);
    fireEvent.click(screen.getByRole("button", { name: "Vaccinations" }));
    await screen.findByText("No vaccinations recorded.");
    fireEvent.click(screen.getByRole("button", { name: "Add vaccination" }));
    fireEvent.change(screen.getByLabelText("Vaccine Name"), { target: { value: "Core vaccine" } });
    fireEvent.change(screen.getByLabelText("Vaccination next due date"), { target: { value: "2027-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(create).toHaveBeenCalledWith("cat-1", expect.objectContaining({ type: "CORE", vaccineName: "Core vaccine", nextDueDate: "2027-01-01" })));
    await waitFor(() => expect(onChanged).toHaveBeenCalledOnce());
  });
});
