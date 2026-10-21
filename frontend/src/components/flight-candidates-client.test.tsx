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
  primaryPhotoUrl: "https://example.test/mila.jpg",
  currentLocationName: "North Shelter",
  archivedAt: null,
  microchipNumber: "chip-123",
  passport: true,
  sponsorName: null,
  adopterName: "Alex Adopter",
  adopterAddress: "12 Cat Street",
  flights: [
    { id: "flight-active", flightNumber: "CY123" },
    { id: "flight-active-2", flightNumber: "CY124" },
  ],
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

  it("shows the candidates table and navigation back to cats", async () => {
    listCandidates.mockResolvedValue([candidate, { ...candidate, id: "cat-2", name: "Luna", requirements: { ...candidate.requirements, rabies: false, felvFivTestDone: false } }]);

    render(<FlightCandidatesClient />);

    expect(await screen.findByRole("heading", { name: "Flight candidates" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Back to cats" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Mila" })).toHaveAttribute("href", "/cats/cat-1");
    expect(screen.getByRole("img", { name: "Mila" })).toHaveAttribute("src", "https://example.test/mila.jpg");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "CY123 flight" })[0]).toHaveAttribute("href", "/flights/flight-active");
    expect(screen.getAllByRole("link", { name: "CY124 flight" })[0]).toHaveAttribute("href", "/flights/flight-active-2");
    expect(screen.getAllByRole("link", { name: "CY123 flight" })[0].className).toBe(screen.getAllByRole("link", { name: "CY124 flight" })[0].className);
    expect(screen.getByLabelText("Rabies: missing")).toBeVisible();
    expect(screen.getByLabelText("FeLV/FIV: missing")).toBeVisible();
    expect(screen.queryByText("Missing")).not.toBeInTheDocument();
    expect(screen.queryByText("Yes")).not.toBeInTheDocument();
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
