"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CatCard } from "@/components/cat-card";
import { CatCard as CatCardType, catsApi } from "@/lib/api";
import { ApiErrorHandler, formatDate } from "@/lib/utils";

export default function CatProfilePage() {
  const params = useParams();
  const catId = params?.id as string;
  const [cat, setCat] = useState<CatCardType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!catId) return;

    const fetchCat = async () => {
      setIsLoading(true);
      setError(null);
      try {
        setCat(await catsApi.getCatCard(catId));
      } catch (err) {
        if (ApiErrorHandler.isNotFoundError(err)) {
          setError("Cat not found");
        } else {
          setError(ApiErrorHandler.handle(err));
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchCat();
  }, [catId]);

  return (
    <main className="min-h-dvh bg-gradient-to-br from-[#f5ece1] to-[#fff8ee] p-6">
      <div className="mx-auto max-w-4xl">
        <Link href={cat?.currentLocationId ? `/locations/${cat.currentLocationId}` : "/locations"} className="text-sm font-medium text-[#d05a2c] hover:text-[#b24a20]">
          ← Back to {cat?.currentLocationName || "Locations"}
        </Link>

        {isLoading && <p className="mt-8 text-center text-sm text-[#6d6a66]">Loading cat profile...</p>}

        {!isLoading && error && (
          <div className="mt-8 rounded-lg border border-red-300 bg-red-50 p-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {!isLoading && cat && (
          <div className="mt-8 grid gap-6 md:grid-cols-[minmax(0,360px)_1fr]">
            <CatCard cat={cat} />
            <section className="rounded-[22px] border border-[#d4c7b4] bg-[#fff8ee]/85 p-6 shadow-panel backdrop-blur-sm">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#d05a2c]">Cat profile</p>
              <h1 className="mt-1 text-4xl font-semibold text-gray-900">{cat.name}</h1>
              <dl className="mt-6 grid gap-4">
                <div className="rounded-xl border border-[#d4c7b4] bg-white/50 p-4">
                  <dt className="font-mono text-xs uppercase tracking-[0.1em] text-[#6d6a66]">Current location</dt>
                  <dd className="mt-1 font-semibold">{cat.currentLocationName || "Not assigned"}</dd>
                </div>
                <div className="rounded-xl border border-[#d4c7b4] bg-white/50 p-4">
                  <dt className="font-mono text-xs uppercase tracking-[0.1em] text-[#6d6a66]">Cat ID</dt>
                  <dd className="mt-1 break-words font-mono text-sm font-medium">{cat.id}</dd>
                </div>
                <div className="rounded-xl border border-[#d4c7b4] bg-white/50 p-4">
                  <dt className="font-mono text-xs uppercase tracking-[0.1em] text-[#6d6a66]">Last updated</dt>
                  <dd className="mt-1 font-semibold">{formatDate(cat.updatedAt)}</dd>
                </div>
              </dl>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
