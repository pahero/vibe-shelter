import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminUser, createAdminUser, fetchAdminUsers } from "@/lib/backend";
import { UserRegistrationClient } from "./user-registration-client";

vi.mock("@/lib/backend", async () => {
  const actual = await vi.importActual<typeof import("@/lib/backend")>("@/lib/backend");
  return {
    ...actual,
    createAdminUser: vi.fn(),
    fetchAdminUsers: vi.fn(),
  };
});

const createAdminUserMock = vi.mocked(createAdminUser);
const fetchAdminUsersMock = vi.mocked(fetchAdminUsers);

const existingUsers: AdminUser[] = [
  {
    id: "user-1",
    email: "test@example.com",
    fullName: "Test Existing",
    role: "staff",
    status: "active",
    isTest: true,
      passwordChangeRequired: false,
    lastLoginAt: null,
    createdAt: "2026-08-17T10:00:00.000Z",
    updatedAt: "2026-08-17T10:00:00.000Z",
  },
  {
    id: "user-2",
    email: "real@example.com",
    fullName: null,
    role: "admin",
    status: "inactive",
    isTest: false,
      passwordChangeRequired: false,
    lastLoginAt: null,
    createdAt: "2026-08-17T11:00:00.000Z",
    updatedAt: "2026-08-17T11:00:00.000Z",
  },
];

describe("UserRegistrationClient", () => {
  beforeEach(() => {
    createAdminUserMock.mockReset();
    fetchAdminUsersMock.mockReset();
  });

  it("loads users when mounted without server-provided users", async () => {
    fetchAdminUsersMock.mockResolvedValue(existingUsers);

    render(<UserRegistrationClient />);

    expect(screen.getByText("Loading users...")).toBeVisible();
    expect(await screen.findByText("Test Existing")).toBeVisible();
    expect(fetchAdminUsersMock).toHaveBeenCalledOnce();
  });
  it("opens and closes the registration form from the current users block", () => {
    render(<UserRegistrationClient initialUsers={existingUsers} />);

    expect(screen.queryByRole("heading", { name: "Register a user" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "User list" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Register user" }));
    expect(screen.getByRole("heading", { name: "Register a user" })).toBeVisible();
    expect(screen.getByLabelText("Email")).toBeVisible();
    expect(screen.getByLabelText("Password")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "User list" })).not.toBeInTheDocument();
    expect(screen.queryByText("Test Existing")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("heading", { name: "Register a user" })).not.toBeInTheDocument();
    expect(screen.getByText("Test Existing")).toBeVisible();
  });

  it("submits isTest and updates the colocated user list after successful registration", async () => {
    const createdUser: AdminUser = {
      id: "user-3",
      email: "new@example.com",
      fullName: "New User",
      role: "staff",
      status: "active",
      isTest: true,
      passwordChangeRequired: false,
      lastLoginAt: null,
      createdAt: "2026-08-17T12:00:00.000Z",
      updatedAt: "2026-08-17T12:00:00.000Z",
    };
    createAdminUserMock.mockResolvedValue(createdUser);

    render(<UserRegistrationClient initialUsers={existingUsers} />);
    fireEvent.click(screen.getByRole("button", { name: "Register user" }));

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@example.com" } });
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "New User" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Password123!" } });
    fireEvent.click(screen.getByLabelText("Test user"));
    fireEvent.click(screen.getByRole("button", { name: "Register user" }));

    await waitFor(() => {
      expect(createAdminUserMock).toHaveBeenCalledWith({
        email: "new@example.com",
        fullName: "New User",
        role: "staff",
        status: "active",
        password: "Password123!",
        isTest: true,
      });
    });
    expect(await screen.findByText("new@example.com was registered successfully.")).toBeVisible();
    expect(screen.getByText("New User")).toBeVisible();
    expect(screen.getAllByText("Test user").length).toBeGreaterThanOrEqual(2);
  });

  it("shows password validation and does not call creation API for blank passwords", () => {
    render(<UserRegistrationClient initialUsers={existingUsers} />);
    fireEvent.click(screen.getByRole("button", { name: "Register user" }));

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "missing-password@example.com" } });
    fireEvent.click(screen.getByLabelText("Not a test user"));
    fireEvent.click(screen.getByRole("button", { name: "Register user" }));

    expect(screen.getByText("Password is required.")).toBeVisible();
    expect(createAdminUserMock).not.toHaveBeenCalled();
    expect(screen.queryByText("missing-password@example.com was registered successfully.")).not.toBeInTheDocument();
  });

  it("displays test and non-test marker labels in the user list", () => {
    render(<UserRegistrationClient initialUsers={existingUsers} />);

    expect(screen.getAllByText("Test user").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Not a test user").length).toBeGreaterThanOrEqual(1);
  });
});
