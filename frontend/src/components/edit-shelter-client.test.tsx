import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { EditShelterClient } from "./edit-shelter-client";

const user = (id: string, fullName: string) => ({
  id,
  fullName,
  email: `${id}@example.com`,
  status: "active",
  role: "staff",
  isTest: false,
});

beforeEach(() => {
  vi.restoreAllMocks();
});

it("assigns multiple responsible users when creating a location", async () => {
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/admin/users"))
        return Response.json([
          user("admin", "Admin"),
          user("first", "First User"),
          user("second", "Second User"),
        ]);
      if (url.includes("/api/locations") && init?.method === "POST")
        return Response.json({ id: "location" });
      if (url.includes("/api/locations"))
        return Response.json({ data: [], total: 0, skip: 0, limit: 100 });
      throw new Error(`Unexpected request ${url}`);
    },
  );
  vi.stubGlobal("fetch", fetchMock);
  render(<EditShelterClient currentUser={{ id: "admin", role: "admin" }} />);
  fireEvent.click(await screen.findByRole("button", { name: "Add location" }));
  fireEvent.change(screen.getByPlaceholderText("New location name"), {
    target: { value: "House" },
  });
  fireEvent.click(screen.getByLabelText("First User"));
  fireEvent.click(screen.getByLabelText("Second User"));
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() =>
    expect(
      fetchMock.mock.calls.some(
        ([url, options]) =>
          String(url).includes("/api/locations") &&
          options?.method === "POST" &&
          JSON.stringify(JSON.parse(String(options.body)).ownerIds) ===
            JSON.stringify(["first", "second"]),
      ),
    ).toBe(true),
  );
});

it("shows owners and saves changes to an existing location", async () => {
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/admin/users"))
        return Response.json([
          user("admin", "Admin"),
          user("first", "First User"),
          user("second", "Second User"),
        ]);
      if (url.includes("/api/locations") && init?.method === "PATCH")
        return Response.json({ id: "location" });
      if (url.includes("/api/locations"))
        return Response.json({
          data: [
            {
              id: "location",
              name: "House",
              description: null,
              status: "ACTIVE",
              owners: [
                {
                  id: "first",
                  fullName: "First User",
                  email: "first@example.com",
                  status: "ACTIVE",
                  deletedAt: null,
                },
              ],
            },
          ],
          total: 1,
          skip: 0,
          limit: 100,
        });
      throw new Error(`Unexpected request ${url}`);
    },
  );
  vi.stubGlobal("fetch", fetchMock);
  render(<EditShelterClient currentUser={{ id: "admin", role: "admin" }} />);
  expect(await screen.findByText("First User")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Edit House" }));
  expect(screen.getByLabelText("First User")).toBeChecked();
  fireEvent.click(screen.getByLabelText("First User"));
  fireEvent.click(screen.getByLabelText("Second User"));
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() =>
    expect(
      fetchMock.mock.calls.some(
        ([url, options]) =>
          String(url).includes("/api/locations/location") &&
          options?.method === "PATCH" &&
          JSON.stringify(JSON.parse(String(options.body)).ownerIds) ===
            JSON.stringify(["second"]),
      ),
    ).toBe(true),
  );
});
