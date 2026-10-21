"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FlightInput, flightsApi } from "@/lib/api";
import { ApiErrorHandler } from "@/lib/utils";

export function FlightCreateClient() {
  const router = useRouter();
  const [form, setForm] = useState<FlightInput>({ date: new Date().toISOString().slice(0, 10), airport: "", flightNumber: "", flightParent: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await flightsApi.create({ ...form, airport: form.airport.trim(), flightNumber: form.flightNumber.trim(), flightParent: form.flightParent.trim() });
      router.push("/flights");
    } catch (reason) {
      setError(ApiErrorHandler.handle(reason));
      setIsSaving(false);
    }
  };

  return (
    <main className="relative min-h-dvh w-full animate-rise">
      <Link href="/flights" aria-label="Back to flights" title="Back to flights" className="fixed left-8 top-10 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-[#d4c7b4] bg-[#fff8ee]/90 text-[#d05a2c] shadow-md backdrop-blur-sm transition hover:bg-white hover:text-[#b24a20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d05a2c]"><FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" /></Link>
      <section className="mx-auto mt-5 w-full max-w-6xl">
        <h1 className="text-2xl font-semibold text-gray-900">Add flight</h1>
        {error && <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800">{error}</p>}
        <form onSubmit={submit} className="mt-5 rounded-2xl border border-[#d4c7b4] bg-white/60 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-gray-800"><span>Date <span className="text-red-700">*</span></span><input type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2" /></label>
            <label className="grid gap-1 text-sm font-medium text-gray-800"><span>Airport <span className="text-red-700">*</span></span><input required value={form.airport} onChange={(event) => setForm({ ...form, airport: event.target.value })} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2" /></label>
            <label className="grid gap-1 text-sm font-medium text-gray-800"><span>Flight number <span className="text-red-700">*</span></span><input required value={form.flightNumber} onChange={(event) => setForm({ ...form, flightNumber: event.target.value })} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2" /></label>
            <label className="grid gap-1 text-sm font-medium text-gray-800"><span>Flight parent <span className="text-red-700">*</span></span><input required value={form.flightParent} onChange={(event) => setForm({ ...form, flightParent: event.target.value })} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2" /></label>
          </div>
          <div className="mt-4 flex justify-end gap-2"><Link href="/flights" className="rounded-xl border border-[#d4c7b4] bg-white px-4 py-2 text-sm font-semibold">Cancel</Link><button disabled={isSaving} className="rounded-xl bg-[#d05a2c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{isSaving ? "Saving..." : "Save flight"}</button></div>
        </form>
      </section>
    </main>
  );
}
