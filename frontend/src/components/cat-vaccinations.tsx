"use client";

import { FormEvent, useEffect, useState } from "react";
import { faPen, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { CatVaccination, catsApi, VaccinationInput, VaccinationType } from "@/lib/api";
import { CatProfileSectionHeader } from "@/components/cat-profile-section-header";
import { ApiErrorHandler, formatDate } from "@/lib/utils";

const typeLabels: Record<VaccinationType, string> = { CORE: "Core", RABIES: "Rabies", OTHER: "Other" };
const emptyVaccination = (): VaccinationInput => ({ type: "CORE", date: new Date().toISOString().slice(0, 10), nextDueDate: null, vaccineName: "" });

export function CatVaccinations({ catId, onChanged }: { catId: string; onChanged?: () => Promise<void> }) {
  const [items, setItems] = useState<CatVaccination[]>([]);
  const [form, setForm] = useState<VaccinationInput>(emptyVaccination);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => setItems(await catsApi.listVaccinations(catId));
  useEffect(() => {
    let cancelled = false;
    catsApi.listVaccinations(catId).then((result) => { if (!cancelled) setItems(result); }).catch((reason: unknown) => { if (!cancelled) setError(ApiErrorHandler.handle(reason)); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [catId]);

  const reset = () => { setEditingId(null); setForm(emptyVaccination()); setFormOpen(false); setError(null); };
  const add = () => { setEditingId(null); setForm(emptyVaccination()); setError(null); setFormOpen(true); setExpanded(true); };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true); setError(null);
    try {
      const payload = { ...form, vaccineName: form.vaccineName?.trim() || null, nextDueDate: form.nextDueDate || null };
      if (editingId) await catsApi.updateVaccination(editingId, payload);
      else await catsApi.createVaccination(catId, payload);
      await refresh(); await onChanged?.(); reset();
    } catch (reason) { setError(ApiErrorHandler.handle(reason)); }
    finally { setSaving(false); }
  };
  const edit = (item: CatVaccination) => { setEditingId(item.id); setForm({ type: item.type, date: item.date, nextDueDate: item.nextDueDate, vaccineName: item.vaccineName ?? "" }); setError(null); setFormOpen(true); setExpanded(true); };
  const remove = async (id: string) => {
    setActionId(id); setError(null);
    try { await catsApi.deleteVaccination(id); await refresh(); await onChanged?.(); if (editingId === id) reset(); }
    catch (reason) { setError(ApiErrorHandler.handle(reason)); }
    finally { setActionId(null); }
  };

  return <section className="overflow-hidden rounded-[22px] border border-[#d4c7b4] bg-[#fff8ee]/85 p-6 shadow-panel backdrop-blur-sm md:col-span-2">
    <CatProfileSectionHeader title="Vaccinations" isExpanded={expanded} onToggle={() => { if (expanded) reset(); setExpanded((value) => !value); }} onAdd={add} addLabel="Add vaccination" />
    {expanded && <>
      {formOpen && <form onSubmit={submit} className="mt-3 grid gap-3 rounded-xl border border-[#d4c7b4] bg-white/50 p-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium"><span>Vaccine Type <span className="text-red-700">*</span></span><select aria-label="Vaccine Type" required value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as VaccinationType })} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2">{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-medium"><span>Date <span className="text-red-700">*</span></span><input aria-label="Vaccination date" type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2" /></label>
        <label className="grid gap-1 text-sm font-medium"><span>Next Due Date</span><input aria-label="Vaccination next due date" type="date" value={form.nextDueDate ?? ""} onChange={(event) => setForm({ ...form, nextDueDate: event.target.value || null })} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2" /></label>
        <label className="grid gap-1 text-sm font-medium"><span>Vaccine Name</span><input aria-label="Vaccine Name" value={form.vaccineName ?? ""} onChange={(event) => setForm({ ...form, vaccineName: event.target.value })} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2" /></label>
        <div className="flex gap-2 md:col-span-2"><button disabled={saving} className="rounded-xl bg-[#d05a2c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save"}</button><button type="button" onClick={reset} className="rounded-xl border border-[#d4c7b4] px-4 py-2 text-sm font-semibold">Cancel</button></div>
      </form>}
      {error && <p className="mt-3 text-sm font-medium text-red-700" role="alert">{error}</p>}
      {loading && <p className="mt-4 text-sm text-[#6d6a66]" role="status">Loading vaccinations...</p>}
      {!loading && items.length === 0 && <p className="mt-4 rounded-xl border border-dashed border-[#d4c7b4] p-4 text-sm text-[#6d6a66]">No vaccinations recorded.</p>}
      <ol className="mt-4 space-y-3">{items.map((item) => <li key={item.id} className="flex flex-col gap-3 rounded-xl border border-[#d4c7b4] bg-white/60 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-semibold text-gray-900">{item.vaccineName || typeLabels[item.type]}</p><p className="text-sm text-[#6d6a66]">{typeLabels[item.type]} · {formatDate(item.date)}{item.nextDueDate ? ` · Next due ${formatDate(item.nextDueDate)}` : ""}</p></div><div className="flex gap-2"><button type="button" onClick={() => edit(item)} aria-label={`Edit ${item.vaccineName || typeLabels[item.type]}`} title={`Edit ${item.vaccineName || typeLabels[item.type]}`} className="rounded-md p-2 text-gray-700 hover:bg-gray-100"><FontAwesomeIcon icon={faPen} /></button><button type="button" onClick={() => void remove(item.id)} disabled={actionId === item.id} aria-label={`Delete ${item.vaccineName || typeLabels[item.type]}`} title={`Delete ${item.vaccineName || typeLabels[item.type]}`} className="rounded-md p-2 text-red-700 hover:bg-red-50 disabled:opacity-50"><FontAwesomeIcon icon={faTrash} /></button></div></li>)}</ol>
    </>}
  </section>;
}
