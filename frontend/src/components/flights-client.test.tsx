import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CatCard,
  catsApi,
  CatHistoryEvent,
  flightsApi,
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
      archive: vi.fn(),
      restore: vi.fn(),
      assignCat: vi.fn(),
      updateAssignment: vi.fn(),
      deleteAssignment: vi.fn(),
      restoreAssignment: vi.fn(),
    },
  };
});

const flight: FlightListItem = {
  id: "flight-1",
  date: "2026-10-15",
  airport: "Larnaca",
  flightNumber: "CY123",
  flightParent: "Morgan Parent",
  comment: "Morgan paid.",
  archivedAt: null,
  deletedAt: null,
  catCount: 1,
  assignedCats: [
    { id: "cat-1", name: "Mila", nameNumber: 1, primaryPhotoUrl: null },
  ],
};
const detail: FlightDetails = {
  ...flight,
  updatedAt: "2026-10-10T10:00:00.000Z",
  cats: [
    {
      assignmentId: "assignment-1",
      cat: {
        id: "cat-1",
        name: "Mila",
        nameNumber: 1,
        archivedAt: null,
        microchipNumber: "chip-1",
        passport: true,
      },
      f2fDone: false,
      tracesDone: true,
    },
  ],
};
const auditEvent: CatHistoryEvent = {
  id: "event-1",
  catId: "cat-1",
  catName: "Mila",
  eventType: "flight_cat_traces_changed",
  occurredAt: "2026-10-10T10:00:00.000Z",
  actorId: "user-1",
  actorFullName: "Staff User",
  oldValue: "false",
  newValue: "true",
  flightId: flight.id,
  flightNumber: flight.flightNumber,
  airport: flight.airport,
  flightDate: flight.date,
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
const catCandidate = {
  id: "cat-2",
  name: "Luna",
  nameNumber: 1,
  archivedAt: null,
} as CatCard;

describe("FlightsClient", () => {
  beforeEach(() => {
    vi.mocked(flightsApi.list).mockReset();
    vi.mocked(flightsApi.get).mockReset();
    vi.mocked(flightsApi.history).mockReset();
    vi.mocked(flightsApi.listPhotos).mockReset();
    vi.mocked(flightsApi.create).mockReset();
    vi.mocked(flightsApi.update).mockReset();
    vi.mocked(flightsApi.delete).mockReset();
    vi.mocked(flightsApi.archive).mockReset();
    vi.mocked(flightsApi.restore).mockReset();
    vi.mocked(flightsApi.deletePhoto).mockReset();
    vi.mocked(flightsApi.assignCat).mockReset();
    vi.mocked(flightsApi.updateAssignment).mockReset();
    vi.mocked(catsApi.listCats).mockReset();
    vi.mocked(catsApi.listFlightCandidateIds).mockReset();
    vi.mocked(flightsApi.list).mockImplementation(
      async (includeDeleted = false) => (includeDeleted ? [] : [flight]),
    );
    vi.mocked(flightsApi.get).mockResolvedValue(detail);
    vi.mocked(flightsApi.history).mockResolvedValue({
      data: [auditEvent],
      total: 1,
      skip: 0,
      limit: 50,
    });
    vi.mocked(flightsApi.listPhotos).mockResolvedValue(flightPhotos);
    vi.mocked(flightsApi.create).mockResolvedValue({ id: "flight-new" });
    vi.mocked(flightsApi.update).mockResolvedValue({ id: flight.id });
    vi.mocked(flightsApi.delete).mockResolvedValue(undefined);
    vi.mocked(flightsApi.archive).mockResolvedValue({ id: flight.id });
    vi.mocked(flightsApi.restore).mockResolvedValue({ id: flight.id });
    vi.mocked(flightsApi.deletePhoto).mockResolvedValue(undefined);
    vi.mocked(flightsApi.assignCat).mockResolvedValue({ id: "assignment-new" });
    vi.mocked(flightsApi.updateAssignment).mockResolvedValue({
      id: "assignment-1",
    });
    vi.mocked(catsApi.listCats).mockResolvedValue({
      data: [catCandidate],
      total: 1,
      skip: 0,
      limit: 100,
    });
    vi.mocked(catsApi.listFlightCandidateIds).mockResolvedValue([
      { id: "cat-2" },
    ]);
  });

  it("shows flight details and shared audit history", async () => {
    render(<FlightsClient />);
    fireEvent.click(await screen.findByRole("button", { name: /CY123/ }));
    const flightDate = await screen.findByRole("heading", {
      name: "Oct 15, 2026",
    });
    const flightDetails = flightDate.parentElement!;
    expect(
      within(flightDetails).getByText("CY123 · Larnaca · 1 cats"),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Mila" })).toHaveAttribute(
      "href",
      "/cats/cat-1",
    );
    expect(
      screen.getByRole("checkbox", { name: "Traces done for Mila" }),
    ).toBeChecked();
    expect(
      await screen.findByText(/Flight CY123 · flight cat traces changed/),
    ).toBeVisible();
    expect(vi.mocked(flightsApi.history)).toHaveBeenCalledWith(flight.id);
  });

  it("keeps restored standalone flight details visible", async () => {
    vi.mocked(flightsApi.get)
      .mockResolvedValueOnce({
        ...detail,
        archivedAt: "2026-10-12T00:00:00.000Z",
      })
      .mockResolvedValueOnce(detail);
    render(<FlightsClient standaloneFlightId={flight.id} />);

    expect(await screen.findByText("Archived")).toBeVisible();
    fireEvent.click(
      await screen.findByRole("button", { name: "Restore flight" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Oct 15, 2026" }),
    ).toBeVisible();
    expect(
      screen.queryByText("This flight is archived."),
    ).not.toBeInTheDocument();
    expect(flightsApi.restore).toHaveBeenCalledWith(flight.id);
  });

  it("shows a restore conflict on inactive flight details", async () => {
    vi.mocked(flightsApi.get).mockResolvedValueOnce({
      ...detail,
      archivedAt: "2026-10-12T00:00:00.000Z",
    });
    vi.mocked(flightsApi.restore).mockRejectedValueOnce(
      new Error(
        "Cannot restore this flight because Mila #1 is assigned to another active flight.",
      ),
    );
    render(<FlightsClient standaloneFlightId={flight.id} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Restore flight" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Cannot restore this flight because Mila #1 is assigned to another active flight.",
    );
  });

  it("assigns a cat and updates its fit-to-fly status", async () => {
    render(<FlightsClient />);
    fireEvent.click(await screen.findByRole("button", { name: /CY123/ }));
    await screen.findByRole("checkbox", { name: "F2F done for Mila" });
    fireEvent.change(screen.getByRole("combobox", { name: "Cat to assign" }), {
      target: { value: "cat-2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Assign" }));
    await waitFor(() =>
      expect(vi.mocked(flightsApi.assignCat)).toHaveBeenCalledWith(
        flight.id,
        "cat-2",
      ),
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: "F2F done for Mila" }),
    );
    await waitFor(() =>
      expect(vi.mocked(flightsApi.updateAssignment)).toHaveBeenCalledWith(
        "assignment-1",
        { f2fDone: true },
      ),
    );
  });

  it("edits a standalone flight", async () => {
    render(<FlightsClient standaloneFlightId={flight.id} />);
    await screen.findByRole("heading", { name: "Oct 15, 2026" });
    fireEvent.click(screen.getByRole("button", { name: "Edit flight" }));
    fireEvent.change(screen.getByLabelText(/Airport/), {
      target: { value: "Paphos" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(vi.mocked(flightsApi.update)).toHaveBeenCalledWith(
        flight.id,
        expect.objectContaining({ airport: "Paphos" }),
      ),
    );
  });

  it("opens, navigates, and deletes a full-size flight photo", async () => {
    render(<FlightsClient standaloneFlightId={flight.id} />);
    const photoButtons = await screen.findAllByRole("button", {
      name: "Open flight photo",
    });
    fireEvent.click(photoButtons[0]);
    expect(
      screen.getByRole("dialog", { name: "Flight photo preview" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Next flight photo" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Flight photo actions" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(vi.mocked(flightsApi.deletePhoto)).toHaveBeenCalledWith(
        flight.id,
        "photo-1",
      ),
    );
  });

  it("opens thumbnail actions with the shared media menu", async () => {
    render(<FlightsClient standaloneFlightId={flight.id} />);
    fireEvent.click(
      (
        await screen.findAllByRole("button", {
          name: "Flight thumbnail actions",
        })
      )[0],
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(vi.mocked(flightsApi.deletePhoto)).toHaveBeenCalledWith(
        flight.id,
        "photo-2",
      ),
    );
  });

  it("keeps standalone details visible after archiving", async () => {
    render(<FlightsClient standaloneFlightId={flight.id} />);
    await screen.findByRole("heading", { name: "Oct 15, 2026" });
    fireEvent.click(screen.getByRole("button", { name: "Archive flight" }));
    expect(
      await screen.findByText(
        "This flight is archived. Its assignments cannot be managed until it is restored.",
      ),
    ).toBeVisible();
    expect(vi.mocked(flightsApi.archive)).toHaveBeenCalledWith(flight.id);
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
      expect(vi.mocked(flightsApi.create)).toHaveBeenCalledWith(
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
