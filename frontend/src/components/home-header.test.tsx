import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomeHeader } from "./home-header";

vi.mock("next/link", () => ({ default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...props}>{children}</a> }));
vi.mock("./notification-center", () => ({ NotificationCenter: () => null }));
vi.mock("./logout-button", () => ({ LogoutButton: () => null }));

describe("HomeHeader", () => {
  it("shows My treatments in the burger menu for authenticated users", () => {
    render(<HomeHeader user={{ id: "user-1", email: "staff@example.com", fullName: "Staff", role: "staff" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("menuitem", { name: "My treatments" })).toHaveAttribute("href", "/my-treatments");
  });

  it("does not show My treatments to signed-out visitors", () => {
    render(<HomeHeader user={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.queryByRole("menuitem", { name: "My treatments" })).not.toBeInTheDocument();
  });
});
