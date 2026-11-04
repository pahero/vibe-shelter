import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomeHeader } from "./home-header";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("./notification-center", () => ({ NotificationCenter: () => null }));
vi.mock("./logout-button", () => ({
  LogoutButton: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>Log out</button>
  ),
}));

describe("HomeHeader", () => {
  it("shows My treatments in the user menu for authenticated users", () => {
    render(
      <HomeHeader
        user={{
          id: "user-1",
          email: "staff@example.com",
          fullName: "Staff",
          role: "staff",
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "User menu" }));
    expect(
      screen.getByRole("menuitem", { name: "My treatments" }),
    ).toHaveAttribute("href", "/my-treatments");
  });

  it("does not show My treatments to signed-out visitors", () => {
    render(<HomeHeader user={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(
      screen.queryByRole("menuitem", { name: "My treatments" }),
    ).not.toBeInTheDocument();
  });

  it("opens a user menu with a profile link", () => {
    render(
      <HomeHeader
        user={{
          id: "user-1",
          email: "staff@example.com",
          fullName: "Staff",
          role: "staff",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "User menu" }));

    expect(screen.getByRole("menu", { name: "User menu" })).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "Profile" })).toHaveAttribute(
      "href",
      "/my-user",
    );
    expect(screen.getByRole("button", { name: "Log out" })).toBeVisible();
  });

  it("places shelter management before flights in the main menu", () => {
    render(
      <HomeHeader
        user={{
          id: "admin-1",
          email: "admin@example.com",
          fullName: "Admin",
          role: "admin",
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

    const mainMenu = screen.getByRole("menu", { name: "Main menu" });
    expect(
      within(mainMenu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent),
    ).toEqual(["Shelter management", "Flights"]);
    expect(
      within(mainMenu).queryByRole("button", { name: "Log out" }),
    ).not.toBeInTheDocument();
  });
});
