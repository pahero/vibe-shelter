import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { catsApi, usersApi } from "@/lib/api";
import { CatTasks } from "./cat-tasks";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    catsApi: { ...actual.catsApi, listTasks: vi.fn() },
    usersApi: { ...actual.usersApi, listUsers: vi.fn() },
  };
});

const listTasks = vi.mocked(catsApi.listTasks);
const listUsers = vi.mocked(usersApi.listUsers);

describe("CatTasks", () => {
  beforeEach(() => {
    listTasks.mockReset().mockResolvedValue([]);
    listUsers.mockReset().mockResolvedValue([
      { id: "user-1", email: "receiver@example.com", fullName: "Receiver", status: "active", isTest: false },
    ]);
  });

  it("removes a selected reminder receiver using a correctly displayed close icon", async () => {
    render(<CatTasks catId="cat-1" />);
    await screen.findByText("No reminders yet.");
    fireEvent.click(screen.getByRole("button", { name: "Add reminder" }));
    const select = screen.getByRole("combobox", { name: "Notification receivers" });
    fireEvent.change(select, { target: { value: "user-1" } });

    const removeButton = screen.getByRole("button", { name: "Remove Receiver" });
    expect(removeButton.querySelector("svg")).toBeInTheDocument();
    expect(select.querySelector('option[value="user-1"]')).toBeDisabled();

    fireEvent.click(removeButton);

    await waitFor(() => expect(screen.queryByRole("button", { name: "Remove Receiver" })).not.toBeInTheDocument());
    expect(select.querySelector('option[value="user-1"]')).not.toBeDisabled();
  });
});
