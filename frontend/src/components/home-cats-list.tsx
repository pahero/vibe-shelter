"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CatCard } from "@/components/cat-card";
import { ApiErrorHandler } from "@/lib/utils";
import { CatCard as CatCardType, catsApi } from "@/lib/api";

const CATS_PER_PAGE = 6;

export function HomeCatsList() {
  const [cats, setCats] = useState<CatCardType[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchCats() {
      setIsLoading(true);
      setError(null);
      setNeedsSignIn(false);

      try {
        const response = await catsApi.listCats({
          status: "ACTIVE",
          search: search.trim() || undefined,
          skip: (currentPage - 1) * CATS_PER_PAGE,
          limit: CATS_PER_PAGE,
        });

        if (!cancelled) {
          setCats(response.data);
          setTotal(response.total);
        }
      } catch (err) {
        if (!cancelled) {
          const statusCode = err && typeof err === "object" && "statusCode" in err ? (err.statusCode as number) : null;
          if (statusCode === 401 || statusCode === 403) {
            setNeedsSignIn(true);
          } else {
            setError(ApiErrorHandler.handle(err));
          }
          setCats([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchCats();

    return () => {
      cancelled = true;
    };
  }, [currentPage, search]);

  const totalPages = Math.ceil(total / CATS_PER_PAGE);

  return (
    <section className="w-full max-w-6xl animate-rise rounded-[22px] border border-[#d4c7b4] bg-[#fff8ee]/85 p-6 shadow-panel backdrop-blur-sm [animation-delay:160ms] md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#d05a2c]">Cats list</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-[-0.02em] text-gray-900">Active cats at a glance</h2>
          <p className="mt-2 max-w-[64ch] text-sm leading-relaxed text-[#6d6a66]">
            Browse current cat cards from the home page. Search by name, microchip, or passport number.
          </p>
        </div>

        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#d4c7b4] bg-white/60 px-4 text-sm font-semibold text-[#1f2320] transition hover:-translate-y-px hover:bg-white"
          href="/locations"
        >
          Manage locations
        </Link>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="grid max-w-md flex-1 gap-1 text-sm font-medium text-gray-800">
          Search cats
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Name, microchip, or passport"
            className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
          />
        </label>
        <p className="text-sm text-[#6d6a66]">{total} active cat{total === 1 ? "" : "s"}</p>
      </div>

      {isLoading && <p className="py-10 text-center text-sm text-[#6d6a66]">Loading cat cards...</p>}

      {!isLoading && needsSignIn && (
        <div className="mt-5 rounded-2xl border border-dashed border-[#d4c7b4] bg-white/45 p-8 text-center">
          <p className="text-sm font-medium text-gray-900">Sign in to view the cats list.</p>
          <p className="mt-1 text-sm text-[#6d6a66]">Cat records are protected for shelter staff.</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="mt-5 rounded-lg border border-red-300 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {!isLoading && !needsSignIn && !error && cats.length === 0 && (
        <div className="mt-5 rounded-2xl border border-dashed border-[#d4c7b4] bg-white/45 p-8 text-center">
          <p className="text-sm text-[#6d6a66]">No active cats found.</p>
        </div>
      )}

      {!isLoading && cats.length > 0 && (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cats.map((cat) => (
            <CatCard key={cat.id} cat={cat} />
          ))}
        </div>
      )}

      {!isLoading && totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between rounded-lg border border-[#d4c7b4] bg-white/60 p-4">
          <span className="text-sm text-[#6d6a66]">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-[#d4c7b4] bg-white px-4 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => prev + 1)}
              disabled={currentPage >= totalPages}
              className="rounded-lg border border-[#d4c7b4] bg-white px-4 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
