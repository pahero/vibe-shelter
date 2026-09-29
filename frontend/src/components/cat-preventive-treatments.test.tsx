import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { catsApi } from "@/lib/api";
import { CatPreventiveTreatments } from "./cat-preventive-treatments";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    catsApi: {
      ...actual.catsApi,
      listPreventiveTreatments: vi.fn(),
      createPreventiveTreatment: vi.fn(),
      updatePreventiveTreatment: vi.fn(),
      deletePreventiveTreatment: vi.fn(),
    },
  };
});

const listTreatments = vi.mocked(catsApi.listPreventiveTreatments);
const createTreatment = vi.mocked(catsApi.createPreventiveTreatment);
const updateTreatment = vi.mocked(catsApi.updatePreventiveTreatment);

describe("CatPreventiveTreatments", () => {
  beforeEach(() => {
    listTreatments.mockReset();
    createTreatment.mockReset();
    updateTreatment.mockReset();
    listTreatments.mockResolvedValue([]);
    createTreatment.mockResolvedValue({ id: "treatment-1" });
    updateTreatment.mockResolvedValue({ id: "treatment-1" });
  });

  it("requires a type and sends the chosen vaccine category", async () => {
    render(<CatPreventiveTreatments catId="cat-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Vaccinations & parasite treatments" }));
    fireEvent.click(screen.getByRole("button", { name: "Add vaccination or treatment" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Vaccine or medicine name" }), { target: { value: "Purevax" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Treatment type" }), { target: { value: "FIRST_VACCINE" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(createTreatment).toHaveBeenCalledWith("cat-1", expect.objectContaining({ name: "Purevax", type: "FIRST_VACCINE" })));
  });

  it("loads and submits a treatment's selected type when editing", async () => {
    listTreatments.mockResolvedValue([{
      id: "treatment-2",
      date: "2026-03-10",
      name: "Annual vaccine",
      type: "SECOND_VACCINE",
      createdAt: "2026-03-10T00:00:00.000Z",
      updatedAt: "2026-03-10T00:00:00.000Z",
    }]);
    render(<CatPreventiveTreatments catId="cat-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Vaccinations & parasite treatments" }));
    fireEvent.click(await screen.findByRole("button", { name: "Edit Annual vaccine" }));
    expect(screen.getByRole("combobox", { name: "Treatment type" })).toHaveValue("SECOND_VACCINE");
    fireEvent.change(screen.getByRole("combobox", { name: "Treatment type" }), { target: { value: "RABIES" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(updateTreatment).toHaveBeenCalledWith("treatment-2", expect.objectContaining({ type: "RABIES" })));
  });
});
