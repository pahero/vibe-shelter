"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { MedicationTable } from "@/components/cat-treatments";
import { catsApi, type FavoriteCatWithActiveTreatment, type CatTreatment } from "@/lib/api";

type FavoriteCat = { cat: FavoriteCatWithActiveTreatment; treatments: CatTreatment[] };

export function MyTreatmentsClient() {
  const [cats, setCats] = useState<FavoriteCat[]>([]);
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionKey, setActionKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const favorites = await catsApi.listFavoriteCatsWithActiveTreatments();
        const today = new Date().toISOString().slice(0, 10);
        const withTreatments = await Promise.all(favorites.map(async (cat) => ({
          cat,
          treatments: (await catsApi.listTreatments(cat.id)).filter((item) => item.startDate <= today && (!item.endDate || item.endDate >= today)),
        })));
        const active = withTreatments.filter((item) => item.treatments.length > 0).sort((a, b) => b.cat.updatedAt.localeCompare(a.cat.updatedAt));
        if (!cancelled) { setCats(active); setActiveCatId(active[0]?.cat.id ?? null); }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const active = cats.find((item) => item.cat.id === activeCatId);
  const today = new Date().toISOString().slice(0, 10);
  const startDate = active ? active.treatments.map((item) => item.startDate).sort()[0] : today;
  const toggleAdministration = async (treatment: CatTreatment, date: string, doseNumber: number, checked: boolean) => {
    if (!activeCatId) return;
    const key = `${treatment.id}-${date}-${doseNumber}`;
    setActionKey(key);
    try {
      await catsApi.setTreatmentAdministration(treatment.id, date, doseNumber, checked);
      const updated = await catsApi.listTreatments(activeCatId);
      setCats((current) => current.map((item) => item.cat.id === activeCatId ? { ...item, treatments: updated.filter((entry) => entry.startDate <= today && (!entry.endDate || entry.endDate >= today)) } : item));
    } finally {
      setActionKey(null);
    }
  };
  return <main className="relative min-h-dvh w-full animate-rise px-6 pt-6 text-[#1f2320]">
    <Link href="/" aria-label="Back to home" title="Back to home" className="fixed left-8 top-10 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-[#d4c7b4] bg-[#fff8ee]/90 text-[#d05a2c] shadow-md backdrop-blur-sm transition hover:bg-white hover:text-[#b24a20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d05a2c]"><FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" /></Link>
    <section className="mx-auto mt-5 w-full max-w-6xl"><h1 className="text-2xl font-semibold text-gray-900">My treatments</h1>
    {loading ? <p className="mt-6 text-sm text-[#6d6a66]">Loading treatments…</p> : error ? <p role="alert" className="mt-6 text-sm text-red-700">Unable to load treatments. Please try again.</p> : cats.length === 0 ? <p className="mt-6 text-sm text-[#6d6a66]">You don&apos;t have favorite cats with active treatments</p> : <>
      <nav aria-label="Favorite cats with active treatments" className="mt-5 flex gap-2 overflow-x-auto pb-2">{cats.map(({ cat }) => <button key={cat.id} type="button" onClick={() => setActiveCatId(cat.id)} aria-pressed={activeCatId === cat.id} className={`shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold transition ${activeCatId === cat.id ? "border-[#b24a20] bg-[#d05a2c] text-white" : "border-[#d4c7b4] bg-white/70 hover:bg-[#efe7da]"}`}>{cat.name} #{cat.nameNumber}</button>)}</nav>
      {active && <section className="mt-5"><MedicationTable treatments={active.treatments} startDate={startDate} endDate={today} onToggle={toggleAdministration} actionKey={actionKey} /></section>}
    </>}
  </section></main>;
}
