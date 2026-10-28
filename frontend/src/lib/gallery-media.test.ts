import { describe, expect, it } from "vitest";
import { isSupportedGalleryUpload } from "./gallery-media";

describe("isSupportedGalleryUpload", () => {
  it.each([
    [{ type: "image/jpeg", name: "cat.jpg" }, true],
    [{ type: "video/mp4", name: "cat.mp4" }, true],
    [{ type: "video/webm", name: "cat.WEBM" }, true],
    [{ type: "video/quicktime", name: "cat.mov" }, false],
    [{ type: "video/mp4", name: "cat.webm" }, false],
    [{ type: "video/webm", name: "cat.mp4" }, false],
    [{ type: "application/pdf", name: "cat.pdf" }, false],
  ])("validates %o as %s", (file, expected) => {
    expect(isSupportedGalleryUpload(file)).toBe(expected);
  });
});
