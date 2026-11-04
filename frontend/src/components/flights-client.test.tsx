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
  flightsApi,
  FlightAuditEvent,
  FlightDetails,
  FlightListItem,
  FlightPhoto,
} from "@/lib/api";
import { FlightsClient } from "./flights-client";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    catsApi: {
      ...actual.catsApi,
      listCats: vi.fn(),
      listFlightCandidateIds: vi.fn(),
    },
    flightsApi: {
      ...actual.flightsApi,
      list: vi.fn(),
      get: vi.fn(),
      history: vi.fn(),
      listPhotos: vi.fn(),
      deletePhoto: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      restore: vi.fn(),
      assignCat: vi.fn(),
      updateAssignment: vi.fn(),
      deleteAssignment: vi.fn(),
      restoreAssignment: vi.fn(),
    },
  };
});

const listFlights = vi.mocked(flightsApi.list);
const getFlight = vi.mocked(flightsApi.get);
const getFlightHistory = vi.mocked(flightsApi.history);
const listFlightPhotos = vi.mocked(flightsApi.listPhotos);
const createFlight = vi.mocked(flightsApi.create);
const updateFlight = vi.mocked(flightsApi.update);
const deleteFlight = vi.mocked(flightsApi.delete);
const deleteFlightPhoto = vi.mocked(flightsApi.deletePhoto);
const assignCat = vi.mocked(flightsApi.assignCat);
const updateAssignment = vi.mocked(flightsApi.updateAssignment);
const listCats = vi.mocked(catsApi.listCats);
const listFlightCandidateIds = vi.mocked(catsApi.listFlightCandidateIds);

const flight: FlightListItem = {
  id: "flight-1",
  date: "2026-10-15",
  airport: "Larnaca",
  flightNumber: "CY123",
  flightParent: "Morgan Parent",
  comment: "Morgan paid.",
  deletedAt: null,
  catCount: 1,
};
const detail: FlightDetails = {
  id: flight.id,
  date: flight.date,
  airport: flight.airport,
  flightNumber: flight.flightNumber,
  flightParent: flight.flightParent,
  comment: flight.comment,
  updatedAt: "2026-10-10T10:00:00.000Z",
  cats: [
    {
      assignmentId: "assignment-1",
      cat: {
        id: "cat-1",
        name: "Mila",
        archivedAt: null,
        microchipNumber: "chip-1",
        passport: true,
      },
      f2fDone: false,
      tracesDone: true,
    },
  ],
};
const auditEvent: FlightAuditEvent = {
  id: "event-1",
  flightId: flight.id,
  eventType: "flight_cat_traces_changed",
  createdAt: "2026-10-10T10:00:00.000Z",
  actor: {
    id: "user-1",
    displayName: "Staff User",
    email: "staff@example.test",
  },
  oldValue: "false",
  newValue: "true",
  cat: { id: "cat-1", name: "Mila", archivedAt: null },
  flight: {
    id: flight.id,
    flightNumber: flight.flightNumber,
    airport: flight.airport,
    date: flight.date,
    isDeleted: false,
  },
  assignment: {
    id: "assignment-1",
    f2fDone: false,
    tracesDone: true,
    isDeleted: false,
  },
};
const flightPhotos: FlightPhoto[] = [
  {
    id: "photo-1",
    flightId: flight.id,
    url: "https://example.test/preview-1.jpg",
    fullUrl: "https://example.test/full-1.jpg",
    createdAt: "2026-10-10T10:00:00.000Z",
  },
  {
    id: "photo-2",
    flightId: flight.id,
    url: "https://example.test/preview-2.jpg",
    fullUrl: "https://example.test/full-2.jpg",
    createdAt: "2026-10-11T10:00:00.000Z",
  },
];

describe("FlightsClient", () => {
  beforeEach(() => {
    listFlights.mockReset();
    getFlight.mockReset();
    getFlightHistory.mockReset();
    listFlightPhotos.mockReset();
    createFlight.mockReset();
    updateFlight.mockReset();
    deleteFlight.mockReset();
    deleteFlightPhoto.mockReset();
    assignCat.mockReset();
    updateAssignment.mockReset();
    listCats.mockReset();
    listFlightCandidateIds.mockReset();
    listFlights.mockImplementation(async (includeDeleted = false) =>
      includeDeleted ? [] : [flight],
    );
    getFlight.mockResolvedValue(detail);
    getFlightHistory.mockResolvedValue([auditEvent]);
    listFlightPhotos.mockResolvedValue(flightPhotos);
    createFlight.mockResolvedValue({ id: "flight-new" });
    updateFlight.mockResolvedValue({ id: flight.id });
    deleteFlight.mockResolvedValue(undefined);
    deleteFlightPhoto.mockResolvedValue(undefined);
    assignCat.mockResolvedValue({ id: "assignment-new" });
    updateAssignment.mockResolvedValue({ id: "assignment-1" });
    listCats.mockResolvedValue({
      data: [
        {
          id: "cat-2",
          name: "Luna",
          nameNumber: 1,
          sex: "FEMALE",
          color: null,
          estimatedBirthDate: null,
          intakeDate: null,
          archivedAt: null,
          sterilizationStatus: "UNKNOWN",
          currentLocationId: null,
          currentLocationName: null,
          createdByUserId: null,
          isTest: false,
          primaryPhotoUrl: null,
          primaryPhotoPositionY: null,
          microchipNumber: null,
          passport: false,
          sponsorName: null,
          adopterName: null,
          adopterAddress: null,
          felvFivTestDone: false,
          intakeDetails: null,
          intakeSource: null,
          updatedAt: "2026-10-10T00:00:00.000Z",
          tags: [],
        },
      ],
      total: 1,
      skip: 0,
      limit: 100,
    });
    listFlightCandidateIds.mockResolvedValue([{ id: "cat-2" }]);
  });

  it("opens a flight with assigned cat checks and audit history", async () => {
    render(<FlightsClient />);
    fireEvent.click(await screen.findByRole("button", { name: /CY123/ }));

    const flightDate = await screen.findByRole("heading", {
      name: "Oct 15, 2026",
    });
    const flightDetails = flightDate.parentElement!;
    expect(flightDate).toBeVisible();
    expect(
      within(flightDetails).getByText("CY123 \u00B7 Larnaca \u00B7 1 cats"),
    ).toBeVisible();
    expect(
      within(flightDetails).getByText("Flight parent: Morgan Parent"),
    ).toBeVisible();
    expect(within(flightDetails).getByText("Morgan paid.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Mila" })).toHaveAttribute(
      "href",
      "/cats/cat-1",
    );
    expect(
      screen.getByRole("checkbox", { name: "F2F done for Mila" }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Traces done for Mila" }),
    ).toBeChecked();
    fireEvent.click(
      screen.getByRole("button", { name: /Flight audit history/ }),
    );
    expect(
      screen.getByText("Traces status changed \u00B7 Mila", { exact: false }),
    ).toBeVisible();
  });

  it("loads deleted flight details from the deleted flights query when the active detail API returns 404", async () => {
    listFlights.mockImplementation(async (includeDeleted = false) =>
      includeDeleted ? [flight] : [],
    );
    getFlight.mockRejectedValue(new Error("Flight not found"));
    getFlightHistory.mockResolvedValue([
      auditEvent,
      {
        ...auditEvent,
        id: "event-unassigned",
        eventType: "flight_cat_unassigned",
        createdAt: "2026-10-11T10:00:00.000Z",
        assignment: {
          id: "assignment-old",
          f2fDone: false,
          tracesDone: false,
          isDeleted: true,
        },
      },
    ]);

    render(<FlightsClient standaloneFlightId={flight.id} />);

    expect(
      await screen.findByText(
        "This flight is deleted. Its assignments cannot be managed until it is restored.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Mila" })).toHaveAttribute(
      "href",
      "/cats/cat-1",
    );
    expect(
      screen.getByText("Read-only assignments for this deleted flight."),
    ).toBeVisible();
    expect(
      screen.getByRole("checkbox", { name: "F2F done for Mila" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("checkbox", { name: "F2F done for Mila" }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Traces done for Mila" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("checkbox", { name: "Traces done for Mila" }),
    ).toBeChecked();
    expect(
      screen.queryByRole("button", { name: "Restore cat" }),
    ).not.toBeInTheDocument();
    expect(getFlightHistory).toHaveBeenCalledWith(flight.id);
    expect(listFlights).toHaveBeenCalledWith(true);
  });

  it("collapses audit history by default and pages through events", async () => {
    const events = Array.from({ length: 11 }, (_, index) => ({
      ...auditEvent,
      id: `event-${index}`,
      eventType: `flight_field_${index}`,
      createdAt: `2026-10-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`,
    }));
    getFlightHistory.mockResolvedValue(events);

    render(<FlightsClient />);
    fireEvent.click(await screen.findByRole("button", { name: /CY123/ }));
    await screen.findByRole("heading", { name: "Oct 15, 2026" });

    const historyToggle = screen.getByRole("button", {
      name: /Flight audit history/,
    });
    expect(historyToggle).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByText("flight_field_0 \u00B7 Mila"),
    ).not.toBeInTheDocument();

    fireEvent.click(historyToggle);
    expect(await screen.findByText("flight_field_0 \u00B7 Mila")).toBeVisible();
    expect(
      screen.queryByText("flight_field_10 \u00B7 Mila"),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(
      await screen.findByText("flight_field_10 \u00B7 Mila"),
    ).toBeVisible();
    expect(screen.getByText("Page 2 of 2")).toBeVisible();
  });

  it("assigns a cat and submits an updated F2F checkbox", async () => {
    render(<FlightsClient />);
    fireEvent.click(await screen.findByRole("button", { name: /CY123/ }));
    await screen.findByRole("checkbox", { name: "F2F done for Mila" });

    fireEvent.change(screen.getByRole("combobox", { name: "Cat to assign" }), {
      target: { value: "cat-2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Assign" }));
    await waitFor(() =>
      expect(assignCat).toHaveBeenCalledWith("flight-1", "cat-2"),
    );

    fireEvent.click(
      screen.getByRole("checkbox", { name: "F2F done for Mila" }),
    );
    await waitFor(() =>
      expect(updateAssignment).toHaveBeenCalledWith("assignment-1", {
        f2fDone: true,
      }),
    );
  });

  it("opens and submits flight editing from the standalone details page", async () => {
    render(<FlightsClient standaloneFlightId={flight.id} />);
    expect(
      await screen.findByRole("heading", { name: "Oct 15, 2026" }),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Edit flight" }));
    expect(screen.getByRole("heading", { name: "Edit flight" })).toBeVisible();
    fireEvent.change(screen.getByLabelText(/Airport/), {
      target: { value: "Paphos" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(updateFlight).toHaveBeenCalledWith(
        "flight-1",
        expect.objectContaining({ airport: "Paphos" }),
      ),
    );
  });

  it("opens flight photo previews and navigates between them", async () => {
    render(<FlightsClient standaloneFlightId={flight.id} />);
    const photoButtons = await screen.findAllByRole("button", {
      name: "Open flight photo",
    });

    expect(
      screen.queryByRole("heading", { name: "Photos" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Add photos")).toHaveClass("h-16", "w-16");
    fireEvent.click(photoButtons[0]);
    expect(
      screen.getByRole("dialog", { name: "Flight photo preview" }),
    ).toBeVisible();
    expect(screen.getByText("1 / 2")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Delete flight photo" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next flight photo" }));
    expect(screen.getByText("2 / 2")).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "Flight photo actions" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(deleteFlightPhoto).toHaveBeenCalledWith(flight.id, "photo-1"),
    );
  });

  it("keeps the standalone details visible after deleting the flight", async () => {
    render(<FlightsClient standaloneFlightId={flight.id} />);
    expect(
      await screen.findByRole("heading", { name: "Oct 15, 2026" }),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Archive flight" }));

    expect(
      await screen.findByText(
        "This flight is deleted. Its assignments cannot be managed until it is restored.",
      ),
    ).toBeVisible();
    expect(
      screen.queryByText(
        "Select a flight to manage its cats and audit history.",
      ),
    ).not.toBeInTheDocument();
    expect(deleteFlight).toHaveBeenCalledWith(flight.id);
  });

  it("submits a flight without a number and with an optional comment", async () => {
    render(<FlightsClient />);
    fireEvent.click(screen.getByRole("button", { name: "Add flight" }));
    fireEvent.change(screen.getByLabelText(/Airport/), {
      target: { value: "Paphos" },
    });
    fireEvent.change(screen.getByLabelText(/Flight parent/), {
      target: { value: "Taylor Parent" },
    });
    fireEvent.change(screen.getByLabelText(/Comment/), {
      target: { value: "Meet at the terminal" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(createFlight).toHaveBeenCalledWith(
        expect.objectContaining({
          airport: "Paphos",
          flightNumber: null,
          flightParent: "Taylor Parent",
          comment: "Meet at the terminal",
        }),
      ),
    );
  });
});
