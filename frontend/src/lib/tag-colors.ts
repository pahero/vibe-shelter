import { CatTag } from "@/lib/api";

export const TAG_COLOR_OPTIONS = [
  "#ffb38a",
  "#f5a3ad",
  "#ffd166",
  "#9ee6a8",
  "#8ecaff",
  "#b8a7ff",
  "#eda6f0",
  "#95d8c8",
  "#ffd6a5",
  "#f7e36d",
  "#caffbf",
  "#9bf6ff",
  "#a0c4ff",
  "#bdb2ff",
  "#ffc6ff",
  "#e7c6ff",
  "#cdeac0",
  "#f2a7b7",
  "#bde0fe",
  "#d8b996",
] as const;

export const VISIBLE_TAG_COLOR_COUNT = 8;

export const DEFAULT_TAG_COLOR = TAG_COLOR_OPTIONS[0];

export function tagChipStyle(tag: Pick<CatTag, "color">) {
  return {
    backgroundColor: tag.color,
    borderColor: tag.color,
  };
}
