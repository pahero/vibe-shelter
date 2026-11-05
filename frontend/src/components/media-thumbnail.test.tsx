import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { MediaThumbnail } from "./media-thumbnail";

function TestThumbnail() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <MediaThumbnail
      menuOpen={menuOpen}
      onMenuOpenChange={setMenuOpen}
      menuLabel="Photo actions"
      preview={<button type="button">Open preview</button>}
    >
      <button type="button">Delete</button>
    </MediaThumbnail>
  );
}

describe("MediaThumbnail", () => {
  it("opens the shared action menu from its compact trigger", () => {
    render(<TestThumbnail />);

    fireEvent.click(screen.getByRole("button", { name: "Photo actions" }));

    expect(screen.getByRole("menu", { name: "Photo actions" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Delete" })).toBeVisible();
  });
});
