import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { catsApi, flightsApi, FlightListItem } from "@/lib/api";
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
  id: "flight-1", date: "2026-10-15", airport: "Larnaca", flightNumber: "CY123", flightParent: "Morgan Parent", deletedAt: null, catCount: 1,
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

    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
    expect(await screen.findByText("CY123")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Flight candidates" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Scheduled flights" })).toBeVisible();
    expect(listFlights).toHaveBeenCalledTimes(1);
    expect(listFlights).toHaveBeenCalledWith(false);
  });

  it("links to flight creation and opens flight rows as details", async () => {
    render(<FlightsListClient />);
    expect(await screen.findByText("CY123")).toBeVisible();

    expect(screen.getByRole("link", { name: "Add flight" })).toHaveAttribute("href", "/flights/new");
    expect(screen.getByRole("link", { name: /CY123/ })).toHaveAttribute("href", "/flights/flight-1");
  });

  it("uses the deleted flights query when the checkbox is selected", async () => {
    render(<FlightsListClient />);
    await screen.findByText("CY123");

    fireEvent.click(screen.getByRole("checkbox", { name: "Show deleted flights" }));

    await waitFor(() => expect(listFlights).toHaveBeenLastCalledWith(true));
    expect(screen.queryByRole("heading", { name: "Flight candidates" })).not.toBeInTheDocument();
  });
});
