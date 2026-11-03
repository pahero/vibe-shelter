import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  catsApi,
  FlightCandidate,
  flightsApi,
  FlightListItem,
} from "@/lib/api";
import { FlightsListClient } from "./flights-list-client";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    catsApi: { ...actual.catsApi, listFlightCandidates: vi.fn() },
    flightsApi: { ...actual.flightsApi, list: vi.fn() },
  };
});

const listFlights = vi.mocked(flightsApi.list);
const listCandidates = vi.mocked(catsApi.listFlightCandidates);
const flight: FlightListItem = {
  id: "flight-1",
  date: "2026-10-15",
  airport: "Larnaca",
  flightNumber: "CY123",
  flightParent: "Morgan Parent",
  comment: null,
  deletedAt: null,
  catCount: 1,
};

const assignedCandidate: FlightCandidate = {
  id: "cat-1",
  name: "Mila",
  primaryPhotoUrl: null,
  currentLocationName: "North Shelter",
  archivedAt: null,
  microchipNumber: null,
  passport: true,
  sponsorName: null,
  adopterName: null,
  adopterAddress: null,
  flights: [
    {
      id: "flight-1",
      flightNumber: "CY123",
      f2fDone: true,
      tracesDone: false,
    },
  ],
  requirements: {
    firstVaccine: true,
    secondVaccine: true,
    rabies: true,
    passport: true,
    chipped: false,
    adopter: false,
    felvFivTestDone: false,
  },
};

describe("FlightsListClient", () => {
  beforeEach(() => {
    listFlights.mockReset();
    listCandidates.mockReset();
    listFlights.mockResolvedValue([flight]);
    listCandidates.mockResolvedValue([]);
  });

  it("shows scheduled flights and links home using only the active flights query", async () => {
    render(<FlightsListClient />);

    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(await screen.findByText("Oct 15, 2026")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Flight candidates" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Scheduled flights" }),
    ).toBeVisible();
    expect(listFlights).toHaveBeenCalledTimes(1);
    expect(listFlights).toHaveBeenCalledWith(false);
  });

  it("links to flight creation and opens flight rows as details", async () => {
    render(<FlightsListClient />);
    expect(await screen.findByText("Oct 15, 2026")).toBeVisible();

    expect(screen.getByRole("link", { name: "Add flight" })).toHaveAttribute(
      "href",
      "/flights/new",
    );
    expect(screen.getByRole("link", { name: /Oct 15, 2026/ })).toHaveAttribute(
      "href",
      "/flights/flight-1",
    );
  });

  it("shows an assigned candidate inside its flight instead of the candidates list", async () => {
    listCandidates.mockResolvedValue([assignedCandidate]);
    render(<FlightsListClient />);

    const flightLink = await screen.findByRole("link", {
      name: /Oct 15, 2026/,
    });
    const flightCard = flightLink.closest("li");

    expect(flightCard).not.toBeNull();
    expect(
      within(flightCard!).getByRole("link", { name: "Mila" }),
    ).toBeVisible();
    expect(within(flightCard!).getByLabelText("F2F: complete")).toBeVisible();
    expect(within(flightCard!).getByLabelText("Traces: missing")).toBeVisible();
    expect(screen.getAllByRole("link", { name: "Mila" })).toHaveLength(1);
    expect(listCandidates).toHaveBeenCalledTimes(1);
  });

  it("uses the deleted flights query when the checkbox is selected", async () => {
    render(<FlightsListClient />);
    await screen.findByText("Oct 15, 2026");

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Show deleted flights" }),
    );

    await waitFor(() => expect(listFlights).toHaveBeenLastCalledWith(true));
    expect(
      screen.queryByRole("heading", { name: "Flight candidates" }),
    ).not.toBeInTheDocument();
  });
});
