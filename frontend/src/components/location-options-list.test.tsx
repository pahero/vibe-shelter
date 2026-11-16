import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { LocationOptionsList } from "./location-options-list";
import type { Location } from "@/lib/api";

function location(
  id: string,
  name: string,
  parentId: string | null = null,
): Location {
  return {
    id,
    name,
    parentId,
    owners: [],
    isTest: false,
    status: "ACTIVE",
    createdAt: "",
    updatedAt: "",
  };
}

it("puts Shelter first and sorts root and sublocations alphabetically", () => {
  const onSelect = vi.fn();
  render(
    <div role="listbox">
      <LocationOptionsList
        locations={[
          location("z", "Zulu"),
          location("child-z", "Zulu room", "a"),
          location("s", "Shelter"),
          location("a", "Alpha"),
          location("child-b", "Beta room", "a"),
        ]}
        value=""
        onSelect={onSelect}
      />
    </div>,
  );

  const options = within(screen.getByRole("listbox")).getAllByRole("option");
  expect(options.map((option) => option.textContent)).toEqual([
    "Shelter",
    "Alpha",
    "Zulu",
  ]);

  fireEvent.click(screen.getByRole("button", { name: "Expand Alpha" }));
  const expandedOptions = within(screen.getByRole("listbox")).getAllByRole(
    "option",
  );
  expect(expandedOptions.map((option) => option.textContent)).toEqual([
    "Shelter",
    "Alpha",
    "Beta room",
    "Zulu room",
    "Zulu",
  ]);

  fireEvent.click(screen.getByRole("option", { name: "Beta room" }));
  expect(onSelect).toHaveBeenCalledWith("child-b");
});

it("sorts alphabetically when there is no Shelter and supports the all option", () => {
  const onSelect = vi.fn();
  render(
    <LocationOptionsList
      locations={[location("z", "Zulu"), location("a", "alpha")]}
      value=""
      onSelect={onSelect}
      includeAllOption
    />,
  );

  const options = screen.getAllByRole("option");
  expect(options.map((option) => option.textContent)).toEqual([
    "All locations",
    "alpha",
    "Zulu",
  ]);
  fireEvent.click(options[0]);
  expect(onSelect).toHaveBeenCalledWith("");
});
