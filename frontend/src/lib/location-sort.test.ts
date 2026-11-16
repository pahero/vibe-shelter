import { describe, expect, it } from "vitest";
import type { Location } from "./api";
import { getDefaultLocationId, sortLocationsForDisplay } from "./location-sort";

function location(
  id: string,
  name: string,
  parentId: string | null = null,
  status: Location["status"] = "ACTIVE",
): Location {
  return {
    id,
    name,
    parentId,
    owners: [],
    isTest: false,
    status,
    createdAt: "",
    updatedAt: "",
  };
}

describe("location display ordering", () => {
  it("sorts Shelter first and sorts remaining names alphabetically", () => {
    const sorted = sortLocationsForDisplay([
      location("z", "Zulu"),
      location("s", "Shelter"),
      location("a", "alpha"),
    ]);

    expect(sorted.map(({ id }) => id)).toEqual(["s", "a", "z"]);
  });

  it("defaults to active Shelter, otherwise the first active root location", () => {
    expect(
      getDefaultLocationId([
        location("z", "Zulu"),
        location("s", "Shelter"),
        location("inactive", "Aardvark", null, "INACTIVE"),
        location("a", "Alpha"),
      ]),
    ).toBe("s");
    expect(
      getDefaultLocationId([
        location("z", "Zulu"),
        location("a", "Alpha"),
        location("inactive", "Shelter", null, "INACTIVE"),
      ]),
    ).toBe("a");
  });

  it("falls back to an active sublocation when there are no active roots", () => {
    expect(
      getDefaultLocationId([
        location("parent", "Shelter", null, "INACTIVE"),
        location("child", "Room", "parent"),
      ]),
    ).toBe("child");
    expect(getDefaultLocationId([])).toBe("");
  });
});
