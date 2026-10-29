import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminUser, createAdminUser, fetchAdminUsers, setAdminUserRole, setAdminUserTestStatus } from "@/lib/backend";
import { UserRegistrationClient } from "./user-registration-client";

vi.mock("@/lib/backend", async () => {
  const actual = await vi.importActual<typeof import("@/lib/backend")>("@/lib/backend");
  return {
    ...actual,
    createAdminUser: vi.fn(),
    fetchAdminUsers: vi.fn(),
    setAdminUserTestStatus: vi.fn(),
    setAdminUserRole: vi.fn(),
  };
});

const createAdminUserMock = vi.mocked(createAdminUser);
const fetchAdminUsersMock = vi.mocked(fetchAdminUsers);
const setAdminUserTestStatusMock = vi.mocked(setAdminUserTestStatus);
const setAdminUserRoleMock = vi.mocked(setAdminUserRole);

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
    setAdminUserTestStatusMock.mockReset();
    setAdminUserRoleMock.mockReset();
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
    expect(screen.getByRole("heading", { name: "Users" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Register user" }));
    expect(screen.getByRole("heading", { name: "Register a user" })).toBeVisible();
    expect(screen.getByLabelText("Email")).toBeVisible();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
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
    fireEvent.click(screen.getByLabelText("Test user"));
    fireEvent.click(screen.getByRole("button", { name: "Register user" }));

    await waitFor(() => {
      expect(createAdminUserMock).toHaveBeenCalledWith(expect.objectContaining({
        email: "new@example.com",
        fullName: "New User",
        role: "staff",
        status: "active",
        isTest: true,
        password: expect.any(String),
      }));
    });
    expect(await screen.findByText("Temporary password for new@example.com is:")).toBeVisible();
    expect(screen.getByText("New User")).toBeVisible();
    expect(screen.getByText("Copy password")).toBeVisible();
  });

  it("validates email and does not call creation API for a blank email", () => {
    render(<UserRegistrationClient initialUsers={existingUsers} />);
    fireEvent.click(screen.getByRole("button", { name: "Register user" }));

    fireEvent.click(screen.getByRole("button", { name: "Register user" }));

    expect(screen.getByText("Email is required.")).toBeVisible();
    expect(createAdminUserMock).not.toHaveBeenCalled();
  });

  it("displays test status actions in the user list", () => {
    render(<UserRegistrationClient initialUsers={existingUsers} />);

    expect(screen.getByRole("button", { name: "Mark non-test" })).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Mark test" })).toHaveLength(1);
  });

  it("changes a user's test marker and updates the displayed list", async () => {
    setAdminUserTestStatusMock.mockResolvedValue({ ...existingUsers[0], isTest: false });
    render(<UserRegistrationClient initialUsers={existingUsers} />);

    fireEvent.click(screen.getByRole("button", { name: "Mark non-test" }));

    await waitFor(() => expect(setAdminUserTestStatusMock).toHaveBeenCalledWith("user-1", false));
    expect(await screen.findByText("test@example.com is now not a test user.")).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Mark test" })).toHaveLength(2);
  });

  it("lets owners change roles, including promoting a user to Owner", async () => {
    setAdminUserRoleMock.mockResolvedValue({ ...existingUsers[0], role: "owner" });
    render(<UserRegistrationClient initialUsers={existingUsers} currentUser={{ id: "owner-1", role: "owner" }} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Change role for test@example.com" }), { target: { value: "owner" } });
    await waitFor(() => expect(setAdminUserRoleMock).toHaveBeenCalledWith("user-1", "owner"));
  });

  it("limits Admin role controls to Admin/Staff targets and excludes Owner promotion", () => {
    const users = [{ ...existingUsers[0], role: "owner" as const }, ...existingUsers.slice(1)];
    render(<UserRegistrationClient initialUsers={users} currentUser={{ id: "admin-1", role: "admin" }} />);
    expect(screen.queryByRole("combobox", { name: "Change role for test@example.com" })).not.toBeInTheDocument();
    const adminTargetRole = screen.getByRole("combobox", { name: "Change role for real@example.com" });
    expect(adminTargetRole).toHaveValue("admin");
    expect(screen.queryByRole("option", { name: "Owner" })).not.toBeInTheDocument();
  });

  it("offers Owner creation only to Owners", () => {
    const { rerender } = render(<UserRegistrationClient initialUsers={existingUsers} currentUser={{ id: "admin-1", role: "admin" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Register user" }));
    expect(screen.queryByRole("option", { name: "Owner" })).not.toBeInTheDocument();
    rerender(<UserRegistrationClient initialUsers={existingUsers} currentUser={{ id: "owner-1", role: "owner" }} />);
    expect(screen.getByRole("option", { name: "Owner" })).toBeInTheDocument();
  });
});
