"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { LocationForm } from "@/components/location-form";
import { locationsApi, Location, CreateLocationDto, UpdateLocationDto } from "@/lib/api";
import { ApiErrorHandler, formatDate } from "@/lib/utils";

export default function EditLocationPage() {
  const router = useRouter();
  const params = useParams();
  const locationId = params?.id as string;

  const [location, setLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async (data: CreateLocationDto | UpdateLocationDto) => {
    if (!location) return;

    setIsSaving(true);
    setError(null);

    try {
      await locationsApi.updateLocation(location.id, data as UpdateLocationDto);
      router.push(`/locations/${location.id}?success=updated`);
    } catch (err) {
      if (ApiErrorHandler.isDuplicateError(err)) {
        setError("A location with this name already exists");
      } else {
        setError(ApiErrorHandler.handle(err));
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-dvh bg-gradient-to-br from-[#f5ece1] to-[#fff8ee] p-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-gray-600">Loading location...</p>
        </div>
      </main>
    );
  }

  if (error && !location) {
    return (
      <main className="min-h-dvh bg-gradient-to-br from-[#f5ece1] to-[#fff8ee] p-6">
        <div className="mx-auto max-w-2xl">
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

  return (
    <main className="min-h-dvh bg-gradient-to-br from-[#f5ece1] to-[#fff8ee] p-6">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/locations/${location.id}`} className="text-sm font-medium text-[#d05a2c] hover:text-[#b24a20]">
            ← Back to Location
          </Link>
          <h1 className="mt-2 text-4xl font-semibold text-gray-900">Edit Location</h1>
          <p className="mt-1 text-gray-600">Update the details for {location.name}</p>
        </div>

        {/* Form Container */}
        <div className="rounded-[22px] border border-[#d4c7b4] bg-[#fff8ee]/85 p-8 shadow-panel backdrop-blur-sm">
          <div className="mb-6 grid gap-3 rounded-2xl border border-[#d4c7b4] bg-white/45 p-4 text-sm">
            <div>
              <span className="font-mono text-xs uppercase tracking-[0.1em] text-[#6d6a66]">Location ID</span>
              <p className="mt-1 break-words font-mono font-medium text-gray-900">{location.id}</p>
            </div>
            <div>
              <span className="font-mono text-xs uppercase tracking-[0.1em] text-[#6d6a66]">Created</span>
              <p className="mt-1 font-medium text-gray-900">{formatDate(location.createdAt)}</p>
            </div>
          </div>
          <LocationForm initialData={location} onSubmit={handleSubmit} isLoading={isSaving} error={error} />
        </div>
      </div>
    </main>
  );
}
