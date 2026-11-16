"use client";

import { useState } from "react";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { Location } from "@/lib/api";
import { sortLocationsForDisplay } from "@/lib/location-sort";

type LocationOptionsListProps = {
  locations: Location[];
  value: string;
  onSelect: (locationId: string) => void;
  includeAllOption?: boolean;
  allOptionLabel?: string;
};

export function LocationOptionsList({
  locations,
  value,
  onSelect,
  includeAllOption = false,
  allOptionLabel = "All locations",
}: LocationOptionsListProps) {
  const [expandedLocationIds, setExpandedLocationIds] = useState<string[]>([]);
  const rootLocations = sortLocationsForDisplay(
    locations.filter((location) => !location.parentId),
  );

  return (
    <>
      {includeAllOption && (
        <button
          type="button"
          role="option"
          aria-selected={value === ""}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect("")}
          className={`block w-full px-3 py-2 text-left transition hover:bg-[#fff0e8] ${
            value === ""
              ? "bg-[#d05a2c] text-white hover:bg-[#d05a2c]"
              : "text-gray-900"
          }`}
        >
          {allOptionLabel}
        </button>
      )}
      {rootLocations.map((location) => {
        const sublocations = sortLocationsForDisplay(
          locations.filter((candidate) => candidate.parentId === location.id),
        );
        const isExpanded = expandedLocationIds.includes(location.id);

        return (
          <div key={location.id}>
            <div className="flex">
              <button
                type="button"
                role="option"
                aria-selected={value === location.id}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onSelect(location.id)}
                disabled={location.status !== "ACTIVE"}
                className={`block min-w-0 flex-1 px-3 py-2 text-left transition hover:bg-[#fff0e8] ${
                  value === location.id
                    ? "bg-[#d05a2c] text-white hover:bg-[#d05a2c]"
                    : location.status === "ACTIVE"
                      ? "text-gray-900"
                      : "cursor-not-allowed text-gray-400"
                }`}
              >
                {location.name}
              </button>
              {sublocations.length > 0 && (
                <button
                  type="button"
                  aria-label={`${isExpanded ? "Collapse" : "Expand"} ${location.name}`}
                  title={`${isExpanded ? "Collapse" : "Expand"} ${location.name}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() =>
                    setExpandedLocationIds((ids) =>
                      isExpanded
                        ? ids.filter((id) => id !== location.id)
                        : [...ids, location.id],
                    )
                  }
                  className="w-10 text-[#6d6a66] hover:bg-[#fff0e8]"
                >
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={isExpanded ? "rotate-180" : ""}
                  />
                </button>
              )}
            </div>
            {isExpanded &&
              sublocations.map((sublocation) => (
                <button
                  key={sublocation.id}
                  type="button"
                  role="option"
                  aria-selected={value === sublocation.id}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onSelect(sublocation.id)}
                  disabled={sublocation.status !== "ACTIVE"}
                  className={`block w-full py-2 pl-8 pr-3 text-left transition hover:bg-[#fff0e8] ${
                    value === sublocation.id
                      ? "bg-[#d05a2c] text-white hover:bg-[#d05a2c]"
                      : sublocation.status === "ACTIVE"
                        ? "text-gray-900"
                        : "cursor-not-allowed text-gray-400"
                  }`}
                >
                  {sublocation.name}
                </button>
              ))}
          </div>
        );
      })}
    </>
  );
}
