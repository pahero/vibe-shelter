import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { flightsApi } from "@/lib/api";
import { FlightCreateClient } from "./flight-create-client";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    flightsApi: {
      ...actual.flightsApi,
      create: vi.fn(),
      addPhoto: vi.fn(),
    },
  };
});

const createFlight = vi.mocked(flightsApi.create);
const addPhoto = vi.mocked(flightsApi.addPhoto);

describe("FlightCreateClient", () => {
  beforeEach(() => {
    push.mockReset();
    createFlight.mockReset();
    addPhoto.mockReset();
    createFlight.mockResolvedValue({ id: "flight-1" });
    addPhoto.mockResolvedValue({
      id: "photo-1",
      flightId: "flight-1",
      url: "https://example.test/photo-1.jpg",
      fullUrl: "https://example.test/photo-1.jpg",
      createdAt: "2026-11-04T00:00:00.000Z",
    });
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:photo-1"),
      revokeObjectURL: vi.fn(),
    });
  });

  it("shows save and cancel actions", () => {
    render(<FlightCreateClient />);

    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute(
      "href",
      "/flights",
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeVisible();
    expect(screen.getByLabelText("Flight parent")).not.toBeRequired();
  });

  it("uploads selected photos after creating the flight", async () => {
    render(<FlightCreateClient />);
    const photo = new File(["photo"], "flight.jpg", { type: "image/jpeg" });

    fireEvent.change(screen.getByLabelText("Add photos"), {
      target: { files: [photo] },
    });
    expect(screen.getByAltText("Selected: flight.jpg")).toBeVisible();

    fireEvent.change(screen.getByLabelText(/Airport/), {
      target: { value: "Larnaca" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(createFlight).toHaveBeenCalledWith(
        expect.objectContaining({ flightParent: null }),
      ),
    );
    await waitFor(() =>
      expect(addPhoto).toHaveBeenCalledWith("flight-1", photo),
    );
    expect(push).toHaveBeenCalledWith("/flights/flight-1");
  });
});
