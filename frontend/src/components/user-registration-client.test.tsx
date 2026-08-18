import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminUser, createAdminUser } from "@/lib/backend";
import { UserRegistrationClient } from "./user-registration-client";

vi.mock("@/lib/backend", async () => {
  const actual = await vi.importActual<typeof import("@/lib/backend")>("@/lib/backend");
  return {
    ...actual,
    createAdminUser: vi.fn(),
  };
});

const createAdminUserMock = vi.mocked(createAdminUser);

const existingUsers: AdminUser[] = [
  {
    id: "user-1",
    email: "test@example.com",
    fullName: "Test Existing",
    role: "staff",
    status: "active",
    isTest: true,
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
    lastLoginAt: null,
    createdAt: "2026-08-17T11:00:00.000Z",
    updatedAt: "2026-08-17T11:00:00.000Z",
  },
];

describe("UserRegistrationClient", () => {
  beforeEach(() => {
    createAdminUserMock.mockReset();
  });

  it("renders the registration form and current user list together", () => {
    render(<UserRegistrationClient initialUsers={existingUsers} />);

    expect(screen.getByRole("heading", { name: "Register a user" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "User list" })).toBeVisible();
    expect(screen.getByLabelText("Email")).toBeVisible();
    expect(screen.getByLabelText("Password")).toBeVisible();
    expect(screen.getByText("Test Existing")).toBeVisible();
    expect(screen.getAllByText("real@example.com").length).toBeGreaterThanOrEqual(1);
  });

  it("submits isTest and updates the colocated user list after successful registration", async () => {
    const createdUser: AdminUser = {
      id: "user-3",
      email: "new@example.com",
      fullName: "New User",
      role: "staff",
      status: "active",
      isTest: true,
      lastLoginAt: null,
      createdAt: "2026-08-17T12:00:00.000Z",
      updatedAt: "2026-08-17T12:00:00.000Z",
    };
    createAdminUserMock.mockResolvedValue(createdUser);

    render(<UserRegistrationClient initialUsers={existingUsers} />);

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
