import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppHeader } from "./app-header";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const adminUser = {
  id: "admin-1",
  email: "admin@shelter.local",
  fullName: "Admin User",
  role: "admin" as const,
};

const staffUser = {
  id: "staff-1",
  email: "staff@shelter.local",
  fullName: null,
  role: "staff" as const,
};

describe("AppHeader", () => {
  it("renders the brand link to home", () => {
    render(<AppHeader user={null} />);

    const brand = screen.getByRole("link", { name: "Friends Of Larnaca Cats" });
    expect(brand).toHaveAttribute("href", "/");
  });

  it("shows sign in link for anonymous users", () => {
    render(<AppHeader user={null} />);

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("button", { name: "Log out" })).not.toBeInTheDocument();
  });

  it("shows admin navigation and user controls for admins", () => {
    render(<AppHeader user={adminUser} />);

    expect(screen.getByRole("link", { name: "Edit shelter" })).toHaveAttribute("href", "/edit-shelter");
    expect(screen.getByRole("link", { name: "Register users" })).toHaveAttribute("href", "/admin/users");
    expect(screen.getByText("Admin User")).toBeVisible();
    expect(screen.getByRole("button", { name: "Log out" })).toBeVisible();
  });

  it("hides edit shelter navigation when requested", () => {
    render(<AppHeader user={adminUser} hideEditShelterLink />);

    expect(screen.queryByRole("link", { name: "Edit shelter" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Register users" })).toHaveAttribute("href", "/admin/users");
  });

  it("does not show admin navigation for staff users", () => {
    render(<AppHeader user={staffUser} />);

    expect(screen.queryByRole("link", { name: "Edit shelter" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Register users" })).not.toBeInTheDocument();
    expect(screen.getByText("staff@shelter.local")).toBeVisible();
  });
});
