import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContextMenu } from "./context-menu";

function TestMenu() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <ContextMenu
        open={open}
        onOpenChange={setOpen}
        menuLabel="Test actions"
        className="absolute"
        trigger={<button type="button">Toggle</button>}
      >
        <button type="button">Action</button>
      </ContextMenu>
      <button type="button">Outside</button>
    </>
  );
}

afterEach(() => vi.restoreAllMocks());

describe("ContextMenu", () => {
  it("dismisses on outside click", () => {
    render(<TestMenu />);

    fireEvent.pointerDown(screen.getByRole("button", { name: "Outside" }));
    expect(screen.queryByRole("menu", { name: "Test actions" })).toBeNull();
  });

  it("dismisses on Escape", () => {
    render(<TestMenu />);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu", { name: "Test actions" })).toBeNull();
  });

  it("shifts a menu that would overflow the viewport", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        if (this.getAttribute("role") === "menu")
          return {
            bottom: 820,
            height: 120,
            left: 900,
            right: 1100,
            top: 700,
            width: 200,
            x: 900,
            y: 700,
            toJSON: () => ({}),
          } as DOMRect;
        return new DOMRect();
      },
    );
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 800,
    });

    render(<TestMenu />);

    await waitFor(() =>
      expect(screen.getByRole("menu", { name: "Test actions" })).toHaveStyle(
        "transform: translate(-108px, -28px)",
      ),
    );
  });
});
