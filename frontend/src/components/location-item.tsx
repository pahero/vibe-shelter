"use client";

import Link from "next/link";
import { Location } from "@/lib/api";

export type LocationItemProps = {
  location: Location;
};

const statusStyles = {
  ACTIVE: { bg: "bg-green-100", text: "text-green-800" },
  INACTIVE: { bg: "bg-yellow-100", text: "text-yellow-800" },
  ARCHIVED: { bg: "bg-red-100", text: "text-red-800" },
};

export function LocationItem({ location }: LocationItemProps) {
  const statusStyle = statusStyles[location.status];

  return (
    <div className="group relative rounded-lg border border-[#d4c7b4] bg-white/75 p-4 transition hover:shadow-md">
      <Link href={`/locations/${location.id}`} aria-label={`View ${location.name}`} className="absolute inset-0 z-10 cursor-pointer rounded-lg" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900">{location.name}</h3>
          </div>

          {location.description && <p className="mt-1 text-sm text-gray-600">{location.description}</p>}

          {location.ownerId && <p className="mt-3 text-xs text-gray-600"><strong>Owner:</strong> {location.ownerId.slice(0, 8)}...</p>}
        </div>

        <div className="flex flex-col gap-2">
          <span className={`rounded px-2 py-1 font-mono text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
            {location.status}
          </span>
        </div>
      </div>

      <div className="relative z-20 mt-3 flex gap-2">
        <Link
          href={`/locations/${location.id}/edit`}
          className="inline-flex items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
        >
          Edit
        </Link>
      </div>
    </div>
  );
}
