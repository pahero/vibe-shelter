"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ApiErrorHandler, formatDateShort } from "@/lib/utils";
import { FlightListItem, flightsApi } from "@/lib/api";
import { FlightCandidatesClient } from "@/components/flight-candidates-client";

export function FlightsListClient() {
  const [flights, setFlights] = useState<FlightListItem[]>([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    flightsApi.list(showDeleted)
      .then((items) => {
        if (!cancelled) setFlights(items);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setLoadingError(ApiErrorHandler.handle(reason));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [showDeleted]);

  return (
    <main className="relative min-h-dvh w-full animate-rise">
      <Link
        href="/"
        aria-label="Back to home"
        title="Back to home"
        className="fixed left-8 top-10 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-[#d4c7b4] bg-[#fff8ee]/90 text-[#d05a2c] shadow-md backdrop-blur-sm transition hover:bg-white hover:text-[#b24a20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d05a2c]"
      >
        <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" />
      </Link>

      <section className="mx-auto mt-5 w-full max-w-6xl">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">Scheduled flights</h1>
          <Link
            href="/flights/new"
            aria-label="Add flight"
            title="Add flight"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d4c7b4] bg-white/70 text-[#333832] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d05a2c]"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" d="M12 5v14M5 12h14" /></svg>
          </Link>
        </div>
        <label className="mt-3 inline-flex items-center gap-2 text-sm text-gray-800">
          <input type="checkbox" checked={showDeleted} onChange={(event) => { setShowDeleted(event.target.checked); setIsLoading(true); setLoadingError(null); }} className="h-4 w-4 rounded border-[#d4c7b4] accent-[#d05a2c]" />
          Show deleted flights
        </label>
        {loadingError && <p className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800" role="alert">{loadingError}</p>}
        {isLoading && <p className="mt-4 text-sm text-[#6d6a66]" role="status">Loading flights...</p>}
        {!isLoading && !loadingError && flights.length === 0 && <p className="mt-4 text-sm text-[#6d6a66]">{showDeleted ? "No deleted flights." : "No flights yet."}</p>}
        {flights.length > 0 && (
          <ul className="mt-4 space-y-2">
            {flights.map((flight) => (
              <li key={flight.id} className="rounded-xl border border-[#d4c7b4] bg-white/70 p-3">
                <Link href={`/flights/${flight.id}`} className="block">
                <span className="block font-semibold text-gray-900">{flight.flightNumber}</span>
                <span className="mt-0.5 block text-xs text-[#6d6a66]">{formatDateShort(flight.date)} · {flight.airport} · {flight.catCount} cats</span>
                <span className="mt-1 block truncate text-xs text-[#6d6a66]">Flight parent: {flight.flightParent}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {!showDeleted && <FlightCandidatesClient embedded />}
      </section>
    </main>
  );
}
