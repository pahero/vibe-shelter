import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { catsApi, locationsApi, usersApi } from "@/lib/api";
import { CatTasks } from "./cat-tasks";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    catsApi: { ...actual.catsApi, listTasks: vi.fn(), createTask: vi.fn() },
    locationsApi: { ...actual.locationsApi, getLocation: vi.fn() },
    usersApi: {
      ...actual.usersApi,
      listUsers: vi.fn(),
      listReminderReceivers: vi.fn(),
    },
  };
});

const listTasks = vi.mocked(catsApi.listTasks);
const listUsers = vi.mocked(usersApi.listReminderReceivers);
const getLocation = vi.mocked(locationsApi.getLocation);
const createTask = vi.mocked(catsApi.createTask);

describe("CatTasks", () => {
  beforeEach(() => {
    listTasks.mockReset().mockResolvedValue([]);
    getLocation.mockReset();
    createTask.mockReset().mockResolvedValue({ id: "new-task" });
    listUsers.mockReset().mockResolvedValue([
      {
        id: "user-1",
        email: "receiver@example.com",
        fullName: "Receiver",
        status: "active",
        isTest: false,
      },
    ]);
  });

  it("loads the cat's reminders from the cat endpoint and paginates them", async () => {
    listTasks.mockResolvedValue(
      Array.from({ length: 21 }, (_, index) => ({
        id: `task-${index}`,
        catId: "cat-1",
        comment: `Reminder ${index}`,
        dueDate: "2030-01-01T12:00:00.000Z",
        receiverIds: ["user-1"],
        completedAt: null,
        completedBy: null,
        createdAt: "",
        updatedAt: "",
      })),
    );
    render(<CatTasks catId="cat-1" currentLocationId={null} />);
    await screen.findByText("Reminder 0");
    expect(listTasks).toHaveBeenCalledWith("cat-1");
    expect(screen.getAllByRole("listitem")).toHaveLength(20);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("Reminder 20")).toBeVisible();
  });

  it("sorts active and completed reminders by ascending due date", async () => {
    const base = {
      catId: "cat-1",
      receiverIds: ["user-1"],
      completedBy: null,
      createdAt: "",
      updatedAt: "",
    };
    listTasks.mockResolvedValue([
      {
        ...base,
        id: "later",
        comment: "Later",
        dueDate: "2030-02-01T12:00:00.000Z",
        completedAt: null,
      },
      {
        ...base,
        id: "earlier",
        comment: "Earlier",
        dueDate: "2030-01-01T12:00:00.000Z",
        completedAt: null,
      },
      {
        ...base,
        id: "done-later",
        comment: "Done later",
        dueDate: "2030-02-01T12:00:00.000Z",
        completedAt: "2031-01-01T00:00:00.000Z",
      },
      {
        ...base,
        id: "done-earlier",
        comment: "Done earlier",
        dueDate: "2030-01-01T12:00:00.000Z",
        completedAt: "2031-01-01T00:00:00.000Z",
      },
    ]);
    render(<CatTasks catId="cat-1" currentLocationId={null} />);
    await screen.findByText("Earlier");
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("Earlier");
    expect(screen.getAllByRole("listitem")[1]).toHaveTextContent("Later");
    fireEvent.click(screen.getByRole("button", { name: "Completed" }));
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent(
      "Done earlier",
    );
    expect(screen.getAllByRole("listitem")[1]).toHaveTextContent("Done later");
  });

  it("preselects active responsible users and allows removing them", async () => {
    listUsers.mockResolvedValue([
      {
        id: "user-1",
        email: "receiver@example.com",
        fullName: "Receiver",
        status: "active",
        isTest: false,
      },
      {
        id: "user-2",
        email: "other@example.com",
        fullName: "Other",
        status: "active",
        isTest: false,
      },
    ]);
    getLocation.mockResolvedValue({
      id: "location-1",
      name: "House",
      description: null,
      isTest: false,
      status: "ACTIVE",
      createdAt: "",
      updatedAt: "",
      owners: [
        {
          id: "user-1",
          fullName: "Receiver",
          email: "receiver@example.com",
          status: "ACTIVE",
          deletedAt: null,
        },
        {
          id: "user-2",
          fullName: "Other",
          email: "other@example.com",
          status: "ACTIVE",
          deletedAt: null,
        },
        {
          id: "inactive",
          fullName: "Inactive",
          email: "inactive@example.com",
          status: "INACTIVE",
          deletedAt: null,
        },
        {
          id: "deleted",
          fullName: "Deleted",
          email: "deleted@example.com",
          status: "ACTIVE",
          deletedAt: "2026-01-01",
        },
      ],
    });
    render(<CatTasks catId="cat-1" currentLocationId="location-1" />);
    await screen.findByText("No reminders yet.");
    fireEvent.click(screen.getByRole("button", { name: "Add reminder" }));
    expect(
      await screen.findByRole("option", { name: "Receiver" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("option", { name: /receiver@example.com/ }),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Remove Receiver" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Remove Other" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Remove Inactive" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Remove Deleted" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove Receiver" }));
    expect(
      screen.queryByRole("button", { name: "Remove Receiver" }),
    ).not.toBeInTheDocument();
    expect(getLocation).toHaveBeenCalledWith("location-1");
    fireEvent.change(screen.getByLabelText("Comment"), {
      target: { value: "Feed cats" },
    });
    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "2030-01-01T12:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(createTask).toHaveBeenCalledWith(
        "cat-1",
        expect.objectContaining({
          comment: "Feed cats",
          receiverIds: ["user-2"],
        }),
      ),
    );
  });

  it("preserves existing receivers when editing a reminder", async () => {
    listTasks.mockResolvedValue([
      {
        id: "task-1",
        catId: "cat-1",
        comment: "Existing",
        dueDate: "2030-01-01T12:00:00.000Z",
        receiverIds: ["user-1"],
        completedAt: null,
        completedBy: null,
        createdAt: "",
        updatedAt: "",
      },
    ]);
    render(<CatTasks catId="cat-1" currentLocationId="location-1" />);
    expect(await screen.findByText("Existing")).toBeVisible();
    expect(
      screen.getByRole("checkbox", { name: "Complete reminder: Existing" }),
    ).not.toBeChecked();
    expect(
      screen.queryByRole("link", { name: /cat/i }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      await screen.findByRole("button", { name: "Edit reminder" }),
    );
    expect(
      screen.getByRole("button", { name: "Remove Receiver" }),
    ).toBeVisible();
    expect(getLocation).not.toHaveBeenCalled();
  });

  it("shows completed reminders with an active checkbox and no strikethrough", async () => {
    listTasks.mockResolvedValue([
      {
        id: "done",
        catId: "cat-1",
        comment: "Finished",
        dueDate: "2030-01-01T12:00:00.000Z",
        receiverIds: ["user-1"],
        completedAt: "2030-01-02T12:00:00.000Z",
        completedBy: null,
        createdAt: "",
        updatedAt: "",
      },
    ]);
    render(<CatTasks catId="cat-1" currentLocationId={null} />);
    await screen.findByText("No reminders yet.");
    fireEvent.click(screen.getByRole("button", { name: "Completed" }));
    const checkbox = await screen.findByRole("checkbox", {
      name: "Reopen reminder: Finished",
    });
    expect(checkbox).toBeChecked();
    expect(checkbox).toBeEnabled();
    expect(screen.getByText("Finished").closest("p")).not.toHaveClass(
      "line-through",
    );
    expect(
      screen.queryByRole("link", { name: /cat/i }),
    ).not.toBeInTheDocument();
  });

  it("reports a location lookup failure instead of silently omitting defaults", async () => {
    getLocation.mockRejectedValue(new Error("Location unavailable"));
    render(<CatTasks catId="cat-1" currentLocationId="location-1" />);
    await screen.findByText("No reminders yet.");
    fireEvent.click(screen.getByRole("button", { name: "Add reminder" }));
    expect(
      await screen.findByText(/Could not load responsible users/),
    ).toBeVisible();
    expect(screen.queryByLabelText("Comment")).not.toBeInTheDocument();
  });

  it("does not apply a pending lookup after the cat changes location", async () => {
    let resolveLocation!: (
      location: Awaited<ReturnType<typeof locationsApi.getLocation>>,
    ) => void;
    getLocation.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveLocation = resolve;
      }),
    );
    const { rerender } = render(
      <CatTasks catId="cat-1" currentLocationId="old" />,
    );
    await screen.findByText("No reminders yet.");
    fireEvent.click(screen.getByRole("button", { name: "Add reminder" }));
    expect(screen.getByText("Loading responsible users...")).toBeVisible();
    rerender(<CatTasks catId="cat-1" currentLocationId="new" />);
    resolveLocation({
      id: "old",
      name: "Old",
      description: null,
      isTest: false,
      status: "ACTIVE",
      createdAt: "",
      updatedAt: "",
      owners: [
        {
          id: "user-1",
          fullName: "Receiver",
          email: "receiver@example.com",
          status: "ACTIVE",
          deletedAt: null,
        },
      ],
    });
    await waitFor(() =>
      expect(
        screen.queryByText("Loading responsible users..."),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: "Remove Receiver" }),
    ).not.toBeInTheDocument();
  });

  it("removes a selected reminder receiver using a correctly displayed close icon", async () => {
    render(<CatTasks catId="cat-1" currentLocationId={null} />);
    await screen.findByText("No reminders yet.");
    fireEvent.click(screen.getByRole("button", { name: "Add reminder" }));
    const select = screen.getByRole("combobox", {
      name: "Notification receivers",
    });
    fireEvent.change(select, { target: { value: "user-1" } });

    const removeButton = screen.getByRole("button", {
      name: "Remove Receiver",
    });
    expect(removeButton.querySelector("svg")).toBeInTheDocument();
    expect(select.querySelector('option[value="user-1"]')).toBeDisabled();

    fireEvent.click(removeButton);

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Remove Receiver" }),
      ).not.toBeInTheDocument(),
    );
    expect(select.querySelector('option[value="user-1"]')).not.toBeDisabled();
  });

  it("keeps reminder form fields within a narrow form column", async () => {
    render(<CatTasks catId="cat-1" currentLocationId={null} />);
    await screen.findByText("No reminders yet.");
    fireEvent.click(screen.getByRole("button", { name: "Add reminder" }));

    expect(screen.getByLabelText("Comment")).toHaveClass("w-full", "min-w-0");
    expect(screen.getByLabelText("Date")).toHaveClass("w-full", "min-w-0");
    expect(screen.getByLabelText("Notification receivers")).toHaveClass(
      "w-full",
      "min-w-0",
    );
  });
});
