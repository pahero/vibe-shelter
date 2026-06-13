"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { locationsApi, Location } from "@/lib/api";
import { ApiErrorHandler, formatDate } from "@/lib/utils";
import { LocationCatsSection } from "@/components/location-cats-section";

const typeStyles = {
  SHELTER: { bg: "bg-blue-100", text: "text-blue-800" },
  CLINIC: { bg: "bg-green-100", text: "text-green-800" },
  FOSTER: { bg: "bg-purple-100", text: "text-purple-800" },
};

const statusStyles = {
  ACTIVE: { bg: "bg-green-100", text: "text-green-800" },
  INACTIVE: { bg: "bg-yellow-100", text: "text-yellow-800" },
  ARCHIVED: { bg: "bg-red-100", text: "text-red-800" },
};

export default function LocationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const locationId = params?.id as string;

  const [location, setLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  useEffect(() => {
    if (!locationId) return;
    fetchLocation();
  }, [locationId]);

  const fetchLocation = async () => {
    if (!locationId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await locationsApi.getLocation(locationId);
      setLocation(data);
    } catch (err) {
      if (ApiErrorHandler.isNotFoundError(err)) {
        setError("Location not found");
      } else {
        setError(ApiErrorHandler.handle(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!location) return;
    if (!confirm(`Archive location "${location.name}"? This action can be undone by changing the status back.`)) {
      return;
    }

    setIsArchiving(true);
    setError(null);
    try {
      await locationsApi.archiveLocation(location.id);
      router.push("/locations?success=archived");
    } catch (err) {
      setError(ApiErrorHandler.handle(err));
    } finally {
      setIsArchiving(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-dvh bg-gradient-to-br from-[#f5ece1] to-[#fff8ee] p-6">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-gray-600">Loading location...</p>
        </div>
      </main>
    );
  }

  if (error && !location) {
    return (
      <main className="min-h-dvh bg-gradient-to-br from-[#f5ece1] to-[#fff8ee] p-6">
        <div className="mx-auto max-w-6xl">
          <Link href="/locations" className="text-sm font-medium text-[#d05a2c] hover:text-[#b24a20]">
            ← Back to Locations
          </Link>
          <div className="mt-8 rounded-lg border border-red-300 bg-red-50 p-6">
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  if (!location) {
    return null;
  }

  const typeStyle = typeStyles[location.type];
  const statusStyle = statusStyles[location.status];

  return (
    <main className="min-h-dvh bg-gradient-to-br from-[#f5ece1] to-[#fff8ee] p-6">
      <div className="mx-auto max-w-6xl">
        {/* Navigation */}
        <div className="mb-8">
          <Link href="/locations" className="text-sm font-medium text-[#d05a2c] hover:text-[#b24a20]">
            ← Back to Locations
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        {/* Location Details */}
        <div className="rounded-[22px] border border-[#d4c7b4] bg-[#fff8ee]/85 p-8 shadow-panel backdrop-blur-sm">
          <div className="space-y-6">
            {/* Name and Type */}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-semibold text-gray-900">{location.name}</h1>
                <span className={`rounded-full px-3 py-1 font-mono text-xs font-medium ${typeStyle.bg} ${typeStyle.text}`}>
                  {location.type}
                </span>
                <span className={`rounded-full px-3 py-1 font-mono text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                  {location.status}
                </span>
              </div>
            </div>

            {/* Description */}
            {location.description && (
              <div>
                <h2 className="font-mono text-xs uppercase tracking-[0.1em] text-[#6d6a66]">Description</h2>
                <p className="mt-2 whitespace-pre-wrap text-gray-700">{location.description}</p>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-[#d4c7b4] bg-white/40 p-4">
                <span className="font-mono text-xs uppercase tracking-[0.1em] text-[#6d6a66]">Location ID</span>
                <p className="mt-2 break-words font-mono text-sm font-medium">{location.id}</p>
              </div>

              {location.ownerId && (
                <div className="rounded-lg border border-[#d4c7b4] bg-white/40 p-4">
                  <span className="font-mono text-xs uppercase tracking-[0.1em] text-[#6d6a66]">Owner ID</span>
                  <p className="mt-2 break-words font-mono text-sm font-medium">{location.ownerId}</p>
                </div>
              )}

              <div className="rounded-lg border border-[#d4c7b4] bg-white/40 p-4">
                <span className="font-mono text-xs uppercase tracking-[0.1em] text-[#6d6a66]">Created</span>
                <p className="mt-2 text-sm">{formatDate(location.createdAt)}</p>
              </div>

              <div className="rounded-lg border border-[#d4c7b4] bg-white/40 p-4">
                <span className="font-mono text-xs uppercase tracking-[0.1em] text-[#6d6a66]">Updated</span>
                <p className="mt-2 text-sm">{formatDate(location.updatedAt)}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 border-t border-[#d4c7b4] pt-6">
              <Link
                href={`/locations/${location.id}/edit`}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#b24a20] bg-[#d05a2c] px-6 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-[#b24a20]"
              >
                Edit Location
              </Link>
              {location.status !== "ARCHIVED" && (
                <button
                  onClick={handleArchive}
                  disabled={isArchiving}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-700 bg-red-600 px-6 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isArchiving ? "Archiving..." : "Archive Location"}
                </button>
              )}
              <Link
                href="/locations"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-6 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Back
              </Link>
            </div>
          </div>
        </div>

        <LocationCatsSection locationId={location.id} locationName={location.name} />
      </div>
    </main>
  );
}
