"use client";

import { useSearchParams } from "next/navigation";
import { LocationsList } from "@/components/locations-list";
import { Suspense } from "react";

function LocationsListWrapper() {
  const searchParams = useSearchParams();
  // Use the search params as a key to force LocationsList to remount when query params change
  const key = searchParams?.toString() ?? "default";
  
  return <LocationsList key={key} />;
}

export function LocationsPageClient() {
  return (
    <Suspense fallback={<div className="text-center py-12">Loading locations...</div>}>
      <LocationsListWrapper />
    </Suspense>
  );
}
