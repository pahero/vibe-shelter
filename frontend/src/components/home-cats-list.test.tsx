import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomeCatsList } from "./home-cats-list";

afterEach(() => vi.restoreAllMocks());

describe("HomeCatsList", () => {
  it("does not show the Trello import action in the cat list", () => {
    render(<HomeCatsList />);
    expect(
      screen.queryByRole("button", { name: "Import Trello card" }),
    ).not.toBeInTheDocument();
  });
});
