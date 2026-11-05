import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MediaThumbnailGrid } from "./media-thumbnail-grid";

describe("MediaThumbnailGrid", () => {
  it("keeps preview items and the add control in the shared grid", () => {
    render(
      <MediaThumbnailGrid>
        <button type="button">Preview</button>
        <button type="button">Add photo</button>
      </MediaThumbnailGrid>,
    );

    expect(
      screen.getByRole("button", { name: "Preview" }).parentElement,
    ).toHaveClass("grid-cols-[repeat(4,max-content)]", "gap-2");
    expect(screen.getByRole("button", { name: "Add photo" })).toBeVisible();
  });
});
