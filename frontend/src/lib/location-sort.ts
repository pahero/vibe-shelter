import type { Location } from "./api";

export function sortLocationsForDisplay(locations: Location[]) {
  return [...locations].sort((first, second) => {
    const firstIsShelter = first.name.toLocaleLowerCase() === "shelter";
    const secondIsShelter = second.name.toLocaleLowerCase() === "shelter";
    if (firstIsShelter !== secondIsShelter) return firstIsShelter ? -1 : 1;
    return first.name.localeCompare(second.name, undefined, {
      sensitivity: "base",
    });
  });
}

export function getDefaultLocationId(locations: Location[]) {
  const activeLocations = locations.filter(
    (location) => location.status === "ACTIVE",
  );
  const activeRootLocations = sortLocationsForDisplay(
    activeLocations.filter((location) => !location.parentId),
  );
  return (
    activeRootLocations[0]?.id ??
    sortLocationsForDisplay(activeLocations)[0]?.id ??
    ""
  );
}
