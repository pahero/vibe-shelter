import { render, screen } from "@testing-library/react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminUsersPage from "./page";
import { fetchAdminUsers, fetchCurrentUser } from "@/lib/backend";

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((target: string) => {
    throw new Error(`redirect:${target}`);
  }),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/backend", async () => {
  const actual = await vi.importActual<typeof import("@/lib/backend")>("@/lib/backend");
  return {
    ...actual,
    fetchCurrentUser: vi.fn(),
    fetchAdminUsers: vi.fn(),
  };
});

const headersMock = vi.mocked(headers);
const redirectMock = vi.mocked(redirect);
const fetchCurrentUserMock = vi.mocked(fetchCurrentUser);
const fetchAdminUsersMock = vi.mocked(fetchAdminUsers);

describe("AdminUsersPage", () => {
  beforeEach(() => {
    headersMock.mockResolvedValue(new Headers({ cookie: "shelter_session=abc" }));
    redirectMock.mockClear();
    fetchCurrentUserMock.mockReset();
    fetchAdminUsersMock.mockReset();
  });

  it("redirects anonymous users to login", async () => {
    fetchCurrentUserMock.mockResolvedValue(null);

    await expect(AdminUsersPage()).rejects.toThrow("redirect:/login?next=/admin/users");
    expect(fetchAdminUsersMock).not.toHaveBeenCalled();
  });

  it("redirects non-admin users home", async () => {
    fetchCurrentUserMock.mockResolvedValue({ id: "staff-1", email: "staff@example.com", fullName: null, role: "staff" });

    await expect(AdminUsersPage()).rejects.toThrow("redirect:/");
    expect(fetchAdminUsersMock).not.toHaveBeenCalled();
  });

  it("renders the admin registration experience for admins", async () => {
    fetchCurrentUserMock.mockResolvedValue({ id: "admin-1", email: "admin@example.com", fullName: "Admin", role: "admin" });
    fetchAdminUsersMock.mockResolvedValue([
      {
        id: "user-1",
        email: "listed@example.com",
        fullName: "Listed User",
        role: "staff",
        status: "active",
        isTest: false,
        lastLoginAt: null,
        createdAt: "2026-08-17T10:00:00.000Z",
        updatedAt: "2026-08-17T10:00:00.000Z",
      },
    ]);

    render(await AdminUsersPage());

    expect(screen.getByRole("heading", { name: "Register a user" })).toBeVisible();
    expect(screen.getByText("Listed User")).toBeVisible();
    expect(fetchAdminUsersMock).toHaveBeenCalledWith("shelter_session=abc");
  });
});
