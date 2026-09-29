import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { catsApi, flightsApi, FlightAuditEvent, FlightDetails, FlightListItem } from "@/lib/api";
import { FlightsClient } from "./flights-client";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    catsApi: { ...actual.catsApi, listCats: vi.fn() },
    flightsApi: {
      ...actual.flightsApi,
      list: vi.fn(), get: vi.fn(), history: vi.fn(), create: vi.fn(), update: vi.fn(),
      delete: vi.fn(), restore: vi.fn(), assignCat: vi.fn(), updateAssignment: vi.fn(), deleteAssignment: vi.fn(), restoreAssignment: vi.fn(),
    },
  };
});

const listFlights = vi.mocked(flightsApi.list);
const getFlight = vi.mocked(flightsApi.get);
const getFlightHistory = vi.mocked(flightsApi.history);
const createFlight = vi.mocked(flightsApi.create);
const assignCat = vi.mocked(flightsApi.assignCat);
const updateAssignment = vi.mocked(flightsApi.updateAssignment);
const listCats = vi.mocked(catsApi.listCats);

const flight: FlightListItem = {
  id: "flight-1", date: "2026-10-15", airport: "Larnaca", flightNumber: "CY123", flightParent: "Morgan Parent", deletedAt: null, catCount: 1,
};
const detail: FlightDetails = {
  id: flight.id,
  date: flight.date,
  airport: flight.airport,
  flightNumber: flight.flightNumber,
  flightParent: flight.flightParent,
  updatedAt: "2026-10-10T10:00:00.000Z",
  cats: [{
    assignmentId: "assignment-1",
    cat: { id: "cat-1", name: "Mila", archivedAt: null, microchipNumber: "chip-1", passportNumber: "passport-1" },
    f2fDone: false,
    tracesDone: true,
  }],
};
const auditEvent: FlightAuditEvent = {
  id: "event-1", flightId: flight.id, eventType: "flight_cat_traces_changed", createdAt: "2026-10-10T10:00:00.000Z",
  actor: { id: "user-1", displayName: "Staff User", email: "staff@example.test" },
  oldValue: "false", newValue: "true", cat: { id: "cat-1", name: "Mila", archivedAt: null },
  flight: { id: flight.id, flightNumber: flight.flightNumber, airport: flight.airport, date: flight.date, isDeleted: false },
  assignment: { id: "assignment-1", f2fDone: false, tracesDone: true, isDeleted: false },
};

describe("FlightsClient", () => {
  beforeEach(() => {
    listFlights.mockReset();
    getFlight.mockReset();
    getFlightHistory.mockReset();
    createFlight.mockReset();
    assignCat.mockReset();
    updateAssignment.mockReset();
    listCats.mockReset();
    listFlights.mockImplementation(async (includeDeleted = false) => includeDeleted ? [] : [flight]);
    getFlight.mockResolvedValue(detail);
    getFlightHistory.mockResolvedValue([auditEvent]);
    createFlight.mockResolvedValue({ id: "flight-new" });
    assignCat.mockResolvedValue({ id: "assignment-new" });
    updateAssignment.mockResolvedValue({ id: "assignment-1" });
    listCats.mockResolvedValue({ data: [{
      id: "cat-2", name: "Luna", sex: "FEMALE", color: null, estimatedBirthDate: null, intakeDate: null, archivedAt: null,
      sterilizationStatus: "UNKNOWN", currentLocationId: null, currentLocationName: null, createdByUserId: null, isTest: false,
      primaryPhotoUrl: null, microchipNumber: null, passportNumber: null, adopterName: null, adopterAddress: null, felvFivTestDone: false,
      rescueSource: null, updatedAt: "2026-10-10T00:00:00.000Z", tags: [],
    }], total: 1, skip: 0, limit: 100 });
  });

  it("opens a flight with assigned cat checks and audit history", async () => {
    render(<FlightsClient />);
    fireEvent.click(await screen.findByRole("button", { name: /CY123/ }));

    expect(await screen.findByRole("heading", { name: "CY123" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Mila" })).toHaveAttribute("href", "/cats/cat-1");
    expect(screen.getByRole("checkbox", { name: "F2F done for Mila" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Traces done for Mila" })).toBeChecked();
    expect(screen.getByText("Traces status changed · Mila")).toBeVisible();
  });

  it("assigns a cat and submits an updated F2F checkbox", async () => {
    render(<FlightsClient />);
    fireEvent.click(await screen.findByRole("button", { name: /CY123/ }));
    await screen.findByRole("checkbox", { name: "F2F done for Mila" });

    fireEvent.change(screen.getByRole("combobox", { name: "Cat to assign" }), { target: { value: "cat-2" } });
    fireEvent.click(screen.getByRole("button", { name: "Assign" }));
    await waitFor(() => expect(assignCat).toHaveBeenCalledWith("flight-1", "cat-2"));

    fireEvent.click(screen.getByRole("checkbox", { name: "F2F done for Mila" }));
    await waitFor(() => expect(updateAssignment).toHaveBeenCalledWith("assignment-1", { f2fDone: true }));
  });

  it("submits a flight with date, airport, number, and parent", async () => {
    render(<FlightsClient />);
    fireEvent.click(screen.getByRole("button", { name: "Add flight" }));
    fireEvent.change(screen.getByLabelText(/Airport/), { target: { value: "Paphos" } });
    fireEvent.change(screen.getByLabelText(/Flight number/), { target: { value: "CY456" } });
    fireEvent.change(screen.getByLabelText(/Flight parent/), { target: { value: "Taylor Parent" } });
    fireEvent.click(screen.getByRole("button", { name: "Save flight" }));

    await waitFor(() => expect(createFlight).toHaveBeenCalledWith(expect.objectContaining({ airport: "Paphos", flightNumber: "CY456", flightParent: "Taylor Parent" })));
  });
});
