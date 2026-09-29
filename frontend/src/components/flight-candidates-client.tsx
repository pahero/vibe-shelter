"use client";

import Link from "next/link";
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
      className={`inline-flex min-w-16 items-center justify-center rounded-full px-2 py-1 text-xs font-semibold ${complete ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-900"}`}
    >
      {complete ? "Yes" : "Missing"}
    </span>
  );
}

function isReady(candidate: FlightCandidate): boolean {
  return Object.values(candidate.requirements).every(Boolean);
}

export function FlightCandidatesClient() {
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
      candidate.passportNumber ?? "",
      candidate.adopterName ?? "",
      candidate.adopterAddress ?? "",
    ].some((value) => value.toLocaleLowerCase().includes(query)));
  }, [candidates, search]);

  const readyCount = candidates.filter(isReady).length;

  return (
    <section className="w-full max-w-6xl animate-rise rounded-[22px] border border-[#d4c7b4] bg-[#fff8ee]/85 p-6 shadow-panel backdrop-blur-sm md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#d05a2c]">Travel preparation</p>
          <h1 className="mt-1 text-3xl font-semibold text-gray-900">Flight candidates</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#6d6a66]">
            Track travel requirements for each cat. A cat is ready when every item is complete.
          </p>
        </div>
        <button
          type="button"
          onClick={reload}
          disabled={isLoading}
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#d4c7b4] bg-white px-4 text-sm font-semibold text-gray-800 transition hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {!isLoading && !error && (
        <p className="mt-5 rounded-xl border border-[#d4c7b4]/80 bg-white/60 px-4 py-3 text-sm text-gray-800" role="status">
          {readyCount} of {candidates.length} cats meet all seven requirements
        </p>
      )}

      <label className="mt-5 grid max-w-md gap-1 text-sm font-medium text-gray-800">
        Search cats
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name, location, passport, chip, or adopter"
          className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
        />
      </label>

      {isLoading && <p className="mt-5 text-sm text-[#6d6a66]" role="status">Loading flight candidates…</p>}
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
        <div className="mt-5 overflow-x-auto rounded-xl border border-[#d4c7b4] bg-white/60">
          <table className="min-w-[1120px] w-full border-collapse text-left text-sm">
            <thead className="bg-[#f1d8c7]/65 text-xs uppercase tracking-wide text-[#514a43]">
              <tr>
                <th scope="col" className="px-3 py-3">Cat</th>
                <th scope="col" className="px-3 py-3">Location</th>
                {visibleRequirements.map(({ key, label }) => <th scope="col" key={key} className="px-3 py-3 text-center">{label}</th>)}
              </tr>
            </thead>
            <tbody>
              {visibleCandidates.map((candidate) => (
                <tr key={candidate.id} className="border-t border-[#d4c7b4]/70 align-middle">
                  <th scope="row" className="px-3 py-2 font-semibold">
                    <Link href={`/cats/${candidate.id}`} className="text-[#a83f1a] underline decoration-transparent underline-offset-2 hover:decoration-current">
                      {candidate.name}
                    </Link>
                    {candidate.archivedAt && <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">Archived</span>}
                  </th>
                  <td className="px-3 py-2 text-gray-700">{candidate.currentLocationName || "Not assigned"}</td>
                  {visibleRequirements.map(({ key, label }) => (
                    <td key={key} className="px-3 py-2 text-center">
                      <RequirementStatus complete={candidate.requirements[key]} label={label} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
