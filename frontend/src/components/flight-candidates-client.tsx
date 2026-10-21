"use client";

import Link from "next/link";
import Image from "next/image";
import { faArrowLeft, faPlane } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useMemo, useState } from "react";
import { catsApi, FlightCandidate, FlightCandidateRequirements } from "@/lib/api";
import { ApiErrorHandler } from "@/lib/utils";

const visibleRequirements: { key: keyof FlightCandidateRequirements; label: string }[] = [
  { key: "rabies", label: "Rabies" },
  { key: "passport", label: "Passport" },
  { key: "chipped", label: "Chipped" },
  { key: "felvFivTestDone", label: "FeLV/FIV" },
];

function RequirementStatus({ complete, label }: { complete: boolean; label: string }) {
  return (
    <span
      aria-label={`${label}: ${complete ? "complete" : "missing"}`}
      title={`${label}: ${complete ? "complete" : "missing"}`}
      className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${complete ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
    >
      {label}
    </span>
  );
}

export function FlightCandidatesClient({ embedded = false }: { embedded?: boolean }) {
  const [candidates, setCandidates] = useState<FlightCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const reload = () => {
    setIsLoading(true);
    setError(null);
    setRefreshKey((key) => key + 1);
  };

  useEffect(() => {
    let cancelled = false;

    catsApi.listFlightCandidates()
      .then((items) => {
        if (!cancelled) setCandidates(items);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(ApiErrorHandler.handle(reason));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const visibleCandidates = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return candidates;
    return candidates.filter((candidate) => [
      candidate.name,
      candidate.currentLocationName ?? "",
      candidate.microchipNumber ?? "",
      candidate.sponsorName ?? "",
      candidate.adopterName ?? "",
      candidate.adopterAddress ?? "",
    ].some((value) => value.toLocaleLowerCase().includes(query)));
  }, [candidates, search]);
  const Wrapper = embedded ? "section" : "main";

  return (
    <Wrapper className={embedded ? "mt-8 w-full" : "relative min-h-dvh w-full animate-rise"}>
      {!embedded && <Link
        href="/"
        aria-label="Back to cats"
        title="Back to cats"
        className="fixed left-8 top-10 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-[#d4c7b4] bg-[#fff8ee]/90 text-[#d05a2c] shadow-md backdrop-blur-sm transition hover:bg-white hover:text-[#b24a20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d05a2c]"
      >
        <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" />
      </Link>}

      <section className={embedded ? "w-full" : "mx-auto mt-5 w-full max-w-6xl"}>
        <h1 className="text-2xl font-semibold text-gray-900">Flight candidates</h1>

      <label className="mt-3 grid max-w-md gap-1 text-sm font-medium text-gray-800">
        Search cats
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name, location, sponsor, chip, or adopter"
          className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
        />
      </label>

      {isLoading && <p className="mt-4 text-sm text-[#6d6a66]" role="status">Loading flight candidates…</p>}
      {error && (
        <div className="mt-5 rounded-xl border border-red-300 bg-red-50 p-4" role="alert">
          <p className="text-sm font-medium text-red-800">{error}</p>
          <button type="button" onClick={reload} className="mt-2 text-sm font-semibold text-red-900 underline">
            Try again
          </button>
        </div>
      )}
      {!isLoading && !error && visibleCandidates.length === 0 && (
        <p className="mt-5 rounded-xl border border-dashed border-[#d4c7b4] p-5 text-sm text-[#6d6a66]">
          {candidates.length === 0 ? "No cats found." : "No cats match your search."}
        </p>
      )}

      {!isLoading && !error && visibleCandidates.length > 0 && (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleCandidates.map((candidate) => (
            <li key={candidate.id} className="rounded-xl border border-[#d4c7b4] bg-white/70 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#d4c7b4] bg-[#f1d8c7]/45">
                  {candidate.primaryPhotoUrl ? (
                    <Image src={candidate.primaryPhotoUrl} alt={`${candidate.name}`} width={72} height={56} unoptimized className="h-full w-full object-cover" />
                  ) : (
                    <span role="img" aria-label={`No photo for ${candidate.name}`} className="text-2xl">🐾</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold text-gray-900">
                    <Link href={`/cats/${candidate.id}`} className="text-[#a83f1a] underline decoration-transparent underline-offset-2 hover:decoration-current">
                      {candidate.name}
                    </Link>
                    {candidate.archivedAt && <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">Archived</span>}
                  </h2>
                  <p className="mt-0.5 truncate text-xs text-[#6d6a66]">{candidate.currentLocationName || "Not assigned"}</p>
                </div>
                {candidate.flights.length > 0 && (
                  <div className="flex shrink-0 gap-1.5">
                    {candidate.flights.map((flight) => (
                      <Link
                        key={flight.id}
                        href={`/flights/${flight.id}`}
                        aria-label={`${flight.flightNumber} flight`}
                        title={flight.flightNumber}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition hover:bg-gray-200"
                      >
                        <FontAwesomeIcon icon={faPlane} aria-hidden="true" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[#d4c7b4]/70 pt-2.5">
                {visibleRequirements.map(({ key, label }) => (
                  <RequirementStatus key={key} complete={candidate.requirements[key]} label={label} />
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
      </section>
    </Wrapper>
  );
}
