import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FlightCandidate, catsApi } from "@/lib/api";
import { FlightCandidatesClient } from "./flight-candidates-client";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, catsApi: { ...actual.catsApi, listFlightCandidates: vi.fn() } };
});

const listCandidates = vi.mocked(catsApi.listFlightCandidates);

const candidate: FlightCandidate = {
  id: "cat-1",
  name: "Mila",
  currentLocationName: "North Shelter",
  archivedAt: null,
  microchipNumber: "chip-123",
  passportNumber: "pass-123",
  adopterName: "Alex Adopter",
  adopterAddress: "12 Cat Street",
  requirements: {
    firstVaccine: true,
    secondVaccine: true,
    rabies: true,
    passport: true,
    chipped: true,
    adopter: true,
    felvFivTestDone: true,
  },
};

describe("FlightCandidatesClient", () => {
  beforeEach(() => listCandidates.mockReset());

  it("shows the requested readiness columns and ready count", async () => {
    listCandidates.mockResolvedValue([candidate, { ...candidate, id: "cat-2", name: "Luna", requirements: { ...candidate.requirements, rabies: false, felvFivTestDone: false } }]);

    render(<FlightCandidatesClient />);

    expect(await screen.findByRole("heading", { name: "Flight candidates" })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("1 of 2 cats meet all seven requirements");
    expect(screen.getByRole("link", { name: "Mila" })).toHaveAttribute("href", "/cats/cat-1");
    expect(screen.getByRole("columnheader", { name: "Rabies" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Passport" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Chipped" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "FeLV/FIV" })).toBeVisible();
    expect(screen.queryByRole("columnheader", { name: "First vaccine" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Second vaccine" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Adopter" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Rabies: missing")).toBeVisible();
    expect(screen.getByLabelText("FeLV/FIV: missing")).toBeVisible();
  });

  it("filters by adopter/address and reports no matching cats", async () => {
    listCandidates.mockResolvedValue([candidate]);
    render(<FlightCandidatesClient />);

    await screen.findByRole("link", { name: "Mila" });
    fireEvent.change(screen.getByRole("textbox", { name: "Search cats" }), { target: { value: "elsewhere" } });

    expect(screen.getByText("No cats match your search.")).toBeVisible();
  });

  it("shows an API error and can retry", async () => {
    listCandidates.mockRejectedValueOnce({ message: "Could not load candidates" }).mockResolvedValueOnce([candidate]);
    render(<FlightCandidatesClient />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load candidates");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("link", { name: "Mila" })).toBeVisible();
    expect(listCandidates).toHaveBeenCalledTimes(2);
  });
});
