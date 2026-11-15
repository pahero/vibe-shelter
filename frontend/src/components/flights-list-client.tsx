"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  faArrowLeft,
  faBoxArchive,
  faRotateLeft,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ApiErrorHandler, formatDateShort } from "@/lib/utils";
import {
  catsApi,
  FlightCandidate,
  FlightListItem,
  flightsApi,
} from "@/lib/api";
import { FlightCandidatesClient } from "@/components/flight-candidates-client";

export function FlightsListClient() {
  const [flights, setFlights] = useState<FlightListItem[]>([]);
  const [candidates, setCandidates] = useState<FlightCandidate[]>([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [restoringFlightId, setRestoringFlightId] = useState<string | null>(
    null,
  );
  const [actingFlightId, setActingFlightId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      flightsApi.list(showDeleted),
      showDeleted ? Promise.resolve([]) : catsApi.listFlightCandidates(),
    ])
      .then(([flightItems, candidateItems]) => {
        if (!cancelled) {
          setFlights(flightItems);
          setCandidates(candidateItems);
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) setLoadingError(ApiErrorHandler.handle(reason));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showDeleted, refreshKey]);

  useEffect(() => {
    const refreshOnReturn = () => {
      setIsLoading(true);
      setLoadingError(null);
      setRefreshKey((value) => value + 1);
    };
    window.addEventListener("focus", refreshOnReturn);
    window.addEventListener("pageshow", refreshOnReturn);
    return () => {
      window.removeEventListener("focus", refreshOnReturn);
      window.removeEventListener("pageshow", refreshOnReturn);
    };
  }, []);

  const restoreFlight = async (flightId: string) => {
    setRestoringFlightId(flightId);
    setLoadingError(null);
    try {
      await flightsApi.restore(flightId);
      setRefreshKey((value) => value + 1);
    } catch (reason) {
      setLoadingError(ApiErrorHandler.handle(reason));
    } finally {
      setRestoringFlightId(null);
    }
  };

  const runActiveFlightAction = async (
    flightId: string,
    action: "archive" | "delete",
  ) => {
    setActingFlightId(flightId);
    setLoadingError(null);
    try {
      if (action === "archive") await flightsApi.archive(flightId);
      else await flightsApi.delete(flightId);
      setIsLoading(true);
      setRefreshKey((value) => value + 1);
    } catch (reason) {
      setLoadingError(ApiErrorHandler.handle(reason));
    } finally {
      setActingFlightId(null);
    }
  };

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
          <h1 className="text-2xl font-semibold text-gray-900">
            Scheduled flights
          </h1>
          <Link
            href="/flights/new"
            aria-label="Add flight"
            title="Add flight"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d4c7b4] bg-white/70 text-[#333832] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d05a2c]"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path strokeLinecap="round" d="M12 5v14M5 12h14" />
            </svg>
          </Link>
        </div>
        <label className="mt-3 inline-flex items-center gap-2 text-sm text-gray-800">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(event) => {
              setShowDeleted(event.target.checked);
              setIsLoading(true);
              setLoadingError(null);
            }}
            className="h-4 w-4 rounded border-[#d4c7b4] accent-[#d05a2c]"
          />
          Show inactive flights
        </label>
        {loadingError && (
          <p
            className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800"
            role="alert"
          >
            {loadingError}
          </p>
        )}
        {isLoading && (
          <p className="mt-4 text-sm text-[#6d6a66]" role="status">
            Loading flights...
          </p>
        )}
        {!isLoading && !loadingError && flights.length === 0 && (
          <p className="mt-4 text-sm text-[#6d6a66]">
            {showDeleted
              ? "No archived or deleted flights."
              : "No flights yet."}
          </p>
        )}
        {flights.length > 0 && (
          <ul className="mt-4 space-y-2">
            {flights.map((flight) => (
              <li
                key={flight.id}
                className="rounded-xl border border-[#d4c7b4] bg-white/70 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/flights/${flight.id}`}
                    className="block min-w-0 flex-1"
                  >
                    <span className="block font-semibold text-gray-900">
                      {formatDateShort(flight.date)}
                    </span>
                    <span className="mt-0.5 block text-xs text-[#6d6a66]">
                      {flight.flightNumber && (
                        <>
                          {flight.flightNumber}
                          {" \u00B7 "}
                        </>
                      )}
                      {flight.airport}
                      {" \u00B7 "}
                      {flight.catCount} cats
                    </span>
                    <span className="mt-1 block truncate text-xs text-[#6d6a66]">
                      Flight parent: {flight.flightParent ?? "Not set"}
                    </span>
                    {flight.comment && (
                      <span className="mt-1 block text-xs text-[#6d6a66]">
                        {flight.comment}
                      </span>
                    )}
                  </Link>
                  {showDeleted && (
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-[#f1d8c7]/60 px-2 py-1 text-xs font-semibold text-[#514a43]">
                        {flight.deletedAt ? "Deleted" : "Archived"}
                      </span>
                      <button
                        type="button"
                        disabled={restoringFlightId === flight.id}
                        onClick={() => void restoreFlight(flight.id)}
                        aria-label={
                          restoringFlightId === flight.id
                            ? "Restoring flight"
                            : "Restore flight"
                        }
                        title={
                          restoringFlightId === flight.id
                            ? "Restoring flight"
                            : "Restore flight"
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#31734b] text-[#31734b] disabled:opacity-50"
                      >
                        <FontAwesomeIcon
                          icon={faRotateLeft}
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  )}
                  {!showDeleted && (
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          void runActiveFlightAction(flight.id, "archive")
                        }
                        disabled={actingFlightId === flight.id}
                        aria-label="Archive flight"
                        title="Archive flight"
                        className="rounded-md p-2 text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                      >
                        <FontAwesomeIcon
                          icon={faBoxArchive}
                          aria-hidden="true"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void runActiveFlightAction(flight.id, "delete")
                        }
                        disabled={actingFlightId === flight.id}
                        aria-label="Delete flight"
                        title="Delete flight"
                        className="rounded-md p-2 text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        <FontAwesomeIcon icon={faTrash} aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>
                {showDeleted && flight.assignedCats.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-[#e5dacb] pt-2">
                    {flight.assignedCats.map((cat) => (
                      <li key={cat.id} className="text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#eadfce]">
                            <div
                              aria-hidden="true"
                              className="h-full w-full bg-cover bg-center"
                              style={
                                cat.primaryPhotoUrl
                                  ? {
                                      backgroundImage: `url(${cat.primaryPhotoUrl})`,
                                    }
                                  : undefined
                              }
                            />
                          </div>
                          <Link
                            href={`/cats/${cat.id}`}
                            className="font-medium text-[#a83f1a] underline-offset-2 hover:underline"
                          >
                            {cat.name} #{cat.nameNumber}
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <FlightCandidatesClient
                  embedded
                  compact
                  candidates={candidates}
                  assignedToFlightId={flight.id}
                />
              </li>
            ))}
          </ul>
        )}
        {!showDeleted && (
          <FlightCandidatesClient
            embedded
            candidates={candidates}
            unassignedOnly
          />
        )}
      </section>
    </main>
  );
}
