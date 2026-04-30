"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LocationForm } from "@/components/location-form";
import { locationsApi, CreateLocationDto, UpdateLocationDto } from "@/lib/api";
import { ApiErrorHandler } from "@/lib/utils";

export default function CreateLocationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: CreateLocationDto | UpdateLocationDto) => {
    setIsLoading(true);
    setError(null);

    try {
      await locationsApi.createLocation(data as CreateLocationDto);
      router.push("/locations?success=created");
    } catch (err) {
      if (ApiErrorHandler.isDuplicateError(err)) {
        setError("A location with this name already exists");
      } else {
        setError(ApiErrorHandler.handle(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-dvh bg-gradient-to-br from-[#f5ece1] to-[#fff8ee] p-6">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/locations" className="text-sm font-medium text-[#d05a2c] hover:text-[#b24a20]">
            ← Back to Locations
          </Link>
          <h1 className="mt-2 text-4xl font-semibold text-gray-900">Create New Location</h1>
          <p className="mt-1 text-gray-600">Add a new shelter, clinic, or foster location to the system</p>
        </div>

        {/* Form Container */}
        <div className="rounded-[22px] border border-[#d4c7b4] bg-[#fff8ee]/85 p-8 shadow-panel backdrop-blur-sm">
          <LocationForm onSubmit={handleSubmit} isLoading={isLoading} error={error} />
        </div>
      </div>
    </main>
  );
}
