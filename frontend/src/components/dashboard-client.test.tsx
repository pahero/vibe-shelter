import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { catsApi, usersApi } from "@/lib/api";
import { DashboardClient } from "./dashboard-client";

const task = {
  id: "task",
  catId: "cat",
  comment: "Feed",
  dueDate: "2025-01-01T00:00:00.000Z",
  receiverIds: ["user"],
  completedAt: null,
  completedBy: null,
  createdAt: "",
  updatedAt: "",
};
const reminder = { ...task, cat: { id: "cat", name: "Milo", nameNumber: 2 } };

describe("DashboardClient", () => {
  beforeEach(() => {
    vi.spyOn(usersApi, "listReminderReceivers").mockResolvedValue([
      {
        id: "user",
        fullName: "Receiver",
        email: "user@example.com",
        status: "active",
        isTest: false,
      },
    ]);
  });
  afterEach(() => vi.restoreAllMocks());

  it("shows the shared reminder card with its cat link and edit form", async () => {
    vi.spyOn(catsApi, "listMyReminders").mockResolvedValue([reminder]);
    const listTasks = vi.spyOn(catsApi, "listTasks");
    render(<DashboardClient />);
    expect(await screen.findByText("Feed")).toBeInTheDocument();
    expect(listTasks).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "My reminders" })).toBeVisible();
    expect(screen.queryByText("The daily list")).not.toBeInTheDocument();
    expect(screen.queryByText("Shelter tasks")).not.toBeInTheDocument();
    expect(
      screen.queryByText("The small acts that keep tails happy."),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Receivers: Receiver/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Milo #2" })).toHaveAttribute(
      "href",
      "/cats/cat",
    );
    const commentLine = screen.getByText("Feed").closest("p");
    expect(commentLine).toContainElement(
      screen.getByRole("link", { name: "Milo #2" }),
    );
    expect(screen.getByText(/Receivers: Receiver/).closest("p")).not.toBe(
      commentLine,
    );
    const reminderLines = screen
      .getByText("Feed")
      .closest("li")
      ?.querySelectorAll("p");
    expect(reminderLines).toHaveLength(3);
    const dateLine = reminderLines?.[1];
    expect(dateLine).not.toBe(commentLine);
    expect(dateLine).not.toBe(reminderLines?.[2]);
    expect(dateLine?.textContent).toMatch(/\d{4}|\w{3}/);
    expect(dateLine).not.toHaveTextContent(/due/i);
    expect(
      screen.getByRole("checkbox", { name: "Complete reminder: Feed" }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("button", { name: "Delete reminder" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Edit reminder" }));
    expect(screen.getByLabelText("Comment")).toHaveValue("Feed");
    expect(
      screen.getByRole("button", { name: "Remove Receiver" }),
    ).toBeVisible();
  });

  it("refreshes the list after completing a reminder", async () => {
    vi.spyOn(catsApi, "listMyReminders")
      .mockResolvedValueOnce([reminder])
      .mockResolvedValue([]);
    vi.spyOn(catsApi, "listTasks").mockResolvedValue([task]);
    const complete = vi
      .spyOn(catsApi, "completeTask")
      .mockResolvedValue({ id: "task" });
    render(<DashboardClient />);
    fireEvent.click(
      await screen.findByRole("checkbox", { name: "Complete reminder: Feed" }),
    );
    await waitFor(() => expect(complete).toHaveBeenCalledWith("task"));
    expect(await screen.findByText("No tasks in this view.")).toBeVisible();
  });

  it("shows an empty state", async () => {
    vi.spyOn(catsApi, "listMyReminders").mockResolvedValue([]);
    render(<DashboardClient />);
    expect(
      await screen.findByText("No tasks in this view."),
    ).toBeInTheDocument();
  });

  it("shows a loading error", async () => {
    vi.spyOn(catsApi, "listMyReminders").mockRejectedValue(new Error("failed"));
    render(<DashboardClient />);
    expect(await screen.findByRole("alert")).toBeVisible();
    expect(
      screen.queryByText("No tasks in this view."),
    ).not.toBeInTheDocument();
  });

  it("groups tasks by completion, updating the count", async () => {
    const today = new Date().toISOString();
    const done = {
      ...task,
      id: "done",
      comment: "Finished",
      completedAt: today,
    };
    const due = { ...task, id: "today", comment: "Due today", dueDate: today };
    vi.spyOn(catsApi, "listMyReminders").mockResolvedValue([
      reminder,
      { ...reminder, ...due },
      { ...reminder, ...done },
    ]);
    vi.spyOn(catsApi, "listTasks").mockResolvedValue([task, due, done]);
    render(<DashboardClient />);
    expect(await screen.findByText("2 tasks")).toBeVisible();
    expect(screen.queryByText("Finished")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Due today" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Completed" }));
    expect(screen.getByText("1 task")).toBeVisible();
    expect(
      screen.getByRole("checkbox", { name: "Reopen reminder: Finished" }),
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Reopen reminder: Finished" }),
    ).toBeEnabled();
    expect(screen.getByText("Finished")).not.toHaveClass("line-through");
    fireEvent.click(screen.getByRole("button", { name: "Active" }));
    expect(screen.getByText("2 tasks")).toBeVisible();
  });

  it("moves an unchecked completed reminder back to Active", async () => {
    const done = { ...task, completedAt: "2025-01-02T00:00:00.000Z" };
    vi.spyOn(catsApi, "listMyReminders")
      .mockResolvedValueOnce([{ ...reminder, ...done }])
      .mockResolvedValue([reminder]);
    const reopen = vi
      .spyOn(catsApi, "reopenTask")
      .mockResolvedValue({ id: task.id });
    render(<DashboardClient />);
    await screen.findByText("No tasks in this view.");
    fireEvent.click(screen.getByRole("button", { name: "Completed" }));
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Reopen reminder: Feed" }),
    );
    await waitFor(() => expect(reopen).toHaveBeenCalledWith("task"));
    expect(await screen.findByText("No tasks in this view.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Active" }));
    expect(
      screen.getByRole("checkbox", { name: "Complete reminder: Feed" }),
    ).not.toBeChecked();
  });

  it("sorts both groups by ascending due date and paginates at 20", async () => {
    const entries = Array.from({ length: 22 }, (_, index) => ({
      ...task,
      id: `t${index}`,
      comment: `Task ${index}`,
      dueDate: new Date(Date.UTC(2030, 0, index + 1)).toISOString(),
    }));
    const completed = [
      {
        ...entries[0],
        id: "done-old",
        comment: "Done old",
        completedAt: "2031-01-01",
      },
      {
        ...entries[1],
        id: "done-new",
        comment: "Done new",
        completedAt: "2031-01-01",
      },
    ];
    vi.spyOn(catsApi, "listMyReminders").mockResolvedValue(
      [...entries, ...completed].map((item) => ({ ...reminder, ...item })),
    );
    vi.spyOn(catsApi, "listTasks").mockResolvedValue([
      ...entries,
      ...completed,
    ]);
    render(<DashboardClient />);
    expect(await screen.findByText("22 tasks")).toBeVisible();
    expect(screen.getAllByRole("listitem")).toHaveLength(20);
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("Task 0");
    expect(screen.queryByText("Task 21")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("Task 20");
    fireEvent.click(screen.getByRole("button", { name: "Completed" }));
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("Done old");
    expect(screen.getAllByRole("listitem")[1]).toHaveTextContent("Done new");
    fireEvent.click(screen.getByRole("button", { name: "Active" }));
    expect(screen.getByText("Page 1 of 2")).toBeVisible();
  });
});
