"use client";

import Link from "next/link";
import { Location } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export type LocationItemProps = {
  location: Location;
  onArchive?: (id: string) => Promise<void>;
  isArchiving?: boolean;
};

const typeStyles = {
  SHELTER: { bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-700", badge: "bg-blue-100" },
  CLINIC: { bg: "bg-green-50", border: "border-green-300", text: "text-green-700", badge: "bg-green-100" },
  FOSTER: { bg: "bg-purple-50", border: "border-purple-300", text: "text-purple-700", badge: "bg-purple-100" },
};

const statusStyles = {
  ACTIVE: { bg: "bg-green-100", text: "text-green-800" },
  INACTIVE: { bg: "bg-yellow-100", text: "text-yellow-800" },
  ARCHIVED: { bg: "bg-red-100", text: "text-red-800" },
};

export function LocationItem({ location, onArchive, isArchiving = false }: LocationItemProps) {
  const typeStyle = typeStyles[location.type];
  const statusStyle = statusStyles[location.status];

  const handleArchive = async () => {
    if (onArchive && confirm(`Archive location "${location.name}"?`)) {
      await onArchive(location.id);
    }
  };

  return (
    <div className={`rounded-lg border ${typeStyle.border} ${typeStyle.bg} p-4 transition hover:shadow-md`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900">{location.name}</h3>
            <span className={`rounded-full px-2 py-1 font-mono text-xs font-medium ${typeStyle.badge} ${typeStyle.text}`}>
              {location.type}
            </span>
          </div>

          {location.description && <p className="mt-1 text-sm text-gray-600">{location.description}</p>}

          <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
            <span>
              <strong>ID:</strong> {location.id.slice(0, 8)}...
            </span>
            {location.ownerId && (
              <span>
                <strong>Owner:</strong> {location.ownerId.slice(0, 8)}...
              </span>
            )}
            <span>
              <strong>Created:</strong> {formatDate(location.createdAt)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className={`rounded px-2 py-1 font-mono text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
            {location.status}
          </span>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <Link
          href={`/locations/${location.id}`}
          className="inline-flex items-center justify-center rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
        >
          View
        </Link>
        <Link
          href={`/locations/${location.id}/edit`}
          className="inline-flex items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
        >
          Edit
        </Link>
        {location.status !== "ARCHIVED" && onArchive && (
          <button
            onClick={handleArchive}
            disabled={isArchiving}
            className="inline-flex items-center justify-center rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isArchiving ? "Archiving..." : "Archive"}
          </button>
        )}
      </div>
    </div>
  );
}
