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
    flightsApi: {
      ...actual.flightsApi,
      list: vi.fn(),
      restore: vi.fn(),
      archive: vi.fn(),
      delete: vi.fn(),
    },
  };
});

const listFlights = vi.mocked(flightsApi.list);
const restoreFlight = vi.mocked(flightsApi.restore);
const archiveFlight = vi.mocked(flightsApi.archive);
const deleteFlight = vi.mocked(flightsApi.delete);
const listCandidates = vi.mocked(catsApi.listFlightCandidates);
const flight: FlightListItem = {
  id: "flight-1",
  date: "2026-10-15",
  airport: "Larnaca",
  flightNumber: "CY123",
  flightParent: "Morgan Parent",
  comment: "Meet at the airport entrance.",
  archivedAt: null,
  deletedAt: null,
  catCount: 1,
  assignedCats: [
    { id: "cat-1", name: "Mila", nameNumber: 1, primaryPhotoUrl: null },
  ],
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
    restoreFlight.mockReset();
    archiveFlight.mockReset();
    deleteFlight.mockReset();
    listCandidates.mockReset();
    listFlights.mockResolvedValue([flight]);
    restoreFlight.mockResolvedValue({ id: flight.id });
    archiveFlight.mockResolvedValue({ id: flight.id });
    deleteFlight.mockResolvedValue(undefined);
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
      screen.getByText("CY123 \u00B7 Larnaca \u00B7 1 cats"),
    ).toBeVisible();
    expect(screen.getByText("Meet at the airport entrance.")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Flight candidates" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Scheduled flights" }),
    ).toBeVisible();
    expect(listFlights).toHaveBeenCalledTimes(1);
    expect(listFlights).toHaveBeenCalledWith(false);
    expect(
      screen.getByRole("button", { name: "Archive flight" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Delete flight" })).toBeVisible();
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
    const candidateLink = await within(flightCard!).findByRole("link", {
      name: "Mila",
    });

    expect(flightCard).not.toBeNull();
    expect(candidateLink).toBeVisible();
    expect(within(flightCard!).getByLabelText("F2F: complete")).toBeVisible();
    expect(within(flightCard!).getByLabelText("Traces: missing")).toBeVisible();
    expect(candidateLink.closest("ul")).toHaveClass("mt-0");
    expect(
      within(flightCard!).queryByRole("link", { name: "CY123 flight" }),
    ).not.toBeInTheDocument();
    expect(candidateLink.closest("section")?.parentElement).toHaveClass("mt-1");
    expect(screen.getAllByRole("link", { name: "Mila" })).toHaveLength(1);
    expect(listCandidates).toHaveBeenCalledTimes(1);
  });

  it("archives and deletes flights from the active list", async () => {
    render(<FlightsListClient />);
    await screen.findByText("Oct 15, 2026");

    fireEvent.click(screen.getByRole("button", { name: "Archive flight" }));
    await waitFor(() => expect(archiveFlight).toHaveBeenCalledWith(flight.id));
    fireEvent.click(screen.getByRole("button", { name: "Delete flight" }));
    await waitFor(() => expect(deleteFlight).toHaveBeenCalledWith(flight.id));
  });

  it("uses the deleted flights query when the checkbox is selected", async () => {
    render(<FlightsListClient />);
    await screen.findByText("Oct 15, 2026");

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Show inactive flights" }),
    );

    await waitFor(() => expect(listFlights).toHaveBeenLastCalledWith(true));
    expect(
      screen.queryByRole("heading", { name: "Flight candidates" }),
    ).not.toBeInTheDocument();
  });

  it("refreshes flights and candidates when returning to the page", async () => {
    render(<FlightsListClient />);
    await screen.findByText("Oct 15, 2026");
    window.dispatchEvent(new Event("focus"));
    await waitFor(() => expect(listFlights).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(listCandidates).toHaveBeenCalledTimes(2));
  });

  it("restores an archived flight from the archived flights view", async () => {
    listFlights
      .mockResolvedValueOnce([flight])
      .mockResolvedValueOnce([flight])
      .mockResolvedValueOnce([]);
    render(<FlightsListClient />);
    await screen.findByText("Oct 15, 2026");
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Show inactive flights" }),
    );
    const restore = await screen.findByRole("button", {
      name: "Restore flight",
    });
    expect(screen.getByRole("link", { name: "Mila #1" })).toBeVisible();
    fireEvent.click(restore);
    await waitFor(() => expect(restoreFlight).toHaveBeenCalledWith(flight.id));
    await waitFor(() => expect(listFlights).toHaveBeenLastCalledWith(true));
  });

  it("shows a restore conflict in the inactive flights list", async () => {
    listFlights.mockResolvedValueOnce([flight]).mockResolvedValueOnce([flight]);
    restoreFlight.mockRejectedValueOnce(
      new Error(
        "Cannot restore this flight because Mila #1 is assigned to another active flight.",
      ),
    );
    render(<FlightsListClient />);
    await screen.findByText("Oct 15, 2026");
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Show inactive flights" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Restore flight" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Cannot restore this flight because Mila #1 is assigned to another active flight.",
    );
  });
});
