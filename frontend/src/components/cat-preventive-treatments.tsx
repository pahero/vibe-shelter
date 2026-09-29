"use client";

import { FormEvent, useEffect, useState } from "react";
import { faPen, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { CatPreventiveTreatment, catsApi, PreventiveTreatmentInput, PreventiveTreatmentType } from "@/lib/api";
import { CatProfileSectionHeader } from "@/components/cat-profile-section-header";
import { ApiErrorHandler, formatDate } from "@/lib/utils";

const treatmentTypeLabels: Record<PreventiveTreatmentType, string> = {
  FIRST_VACCINE: "First vaccine",
  SECOND_VACCINE: "Second vaccine",
  RABIES: "Rabies",
  OTHER: "Other / parasite treatment",
};

const emptyTreatment = (): PreventiveTreatmentInput => ({
  date: new Date().toISOString().slice(0, 10),
  name: "",
  type: "OTHER",
});

export function CatPreventiveTreatments({ catId, onChanged }: { catId: string; onChanged?: () => Promise<void> }) {
  const [treatments, setTreatments] = useState<CatPreventiveTreatment[]>([]);
  const [form, setForm] = useState<PreventiveTreatmentInput>(emptyTreatment);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => setTreatments(await catsApi.listPreventiveTreatments(catId));

  useEffect(() => {
    let cancelled = false;
    catsApi.listPreventiveTreatments(catId)
      .then((items) => { if (!cancelled) setTreatments(items); })
      .catch((reason: unknown) => { if (!cancelled) setError(ApiErrorHandler.handle(reason)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [catId]);

  const reset = () => {
    setEditingId(null);
    setForm(emptyTreatment());
    setFormOpen(false);
    setError(null);
  };

  const add = () => {
    setEditingId(null);
    setForm(emptyTreatment());
    setError(null);
    setFormOpen(true);
    setExpanded(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.date || !form.name.trim()) {
      setError("Enter a date, treatment type, and vaccine or medicine name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form, name: form.name.trim() };
      if (editingId) await catsApi.updatePreventiveTreatment(editingId, payload);
      else await catsApi.createPreventiveTreatment(catId, payload);
      await refresh();
      await onChanged?.();
      reset();
    } catch (reason) {
      setError(ApiErrorHandler.handle(reason));
    } finally {
      setSaving(false);
    }
  };

  const edit = (treatment: CatPreventiveTreatment) => {
    setEditingId(treatment.id);
    setForm({ date: treatment.date, name: treatment.name, type: treatment.type });
    setFormOpen(true);
    setExpanded(true);
  };

  const remove = async (id: string) => {
    setActionId(id);
    setError(null);
    try {
      await catsApi.deletePreventiveTreatment(id);
      await refresh();
      await onChanged?.();
      if (editingId === id) reset();
    } catch (reason) {
      setError(ApiErrorHandler.handle(reason));
    } finally {
      setActionId(null);
    }
  };

  return (
    <section className="overflow-hidden rounded-[22px] border border-[#d4c7b4] bg-[#fff8ee]/85 p-6 shadow-panel backdrop-blur-sm md:col-span-2">
      <CatProfileSectionHeader
        title="Vaccinations & parasite treatments"
        isExpanded={expanded}
        onToggle={() => {
          if (expanded) reset();
          setExpanded((value) => !value);
        }}
        onAdd={add}
        addLabel="Add vaccination or treatment"
      />
      {expanded && (
        <>
          {formOpen && (
            <form onSubmit={submit} className="mt-3 grid gap-3 rounded-xl border border-[#d4c7b4] bg-white/50 p-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium text-gray-800">
                <span>Date <span className="text-red-700">*</span></span>
                <input aria-label="Vaccination or treatment date" type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-gray-800">
                <span>Treatment type <span className="text-red-700">*</span></span>
                <select aria-label="Treatment type" required value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as PreventiveTreatmentType })} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2">
                  {Object.entries(treatmentTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-gray-800 md:col-span-2">
                <span>Vaccine or medicine <span className="text-red-700">*</span></span>
                <input aria-label="Vaccine or medicine name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2" />
              </label>
              <div className="flex gap-2 md:col-span-2">
                <button disabled={saving} className="rounded-xl bg-[#d05a2c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
                <button type="button" onClick={reset} className="rounded-xl border border-[#d4c7b4] px-4 py-2 text-sm font-semibold">Cancel</button>
              </div>
            </form>
          )}
          {error && <p className="mt-3 text-sm font-medium text-red-700" role="alert">{error}</p>}
          {loading && <p className="mt-4 text-sm text-[#6d6a66]" role="status">Loading vaccinations and treatments...</p>}
          {!loading && treatments.length === 0 && <p className="mt-4 rounded-xl border border-dashed border-[#d4c7b4] p-4 text-sm text-[#6d6a66]">No vaccinations or parasite treatments yet.</p>}
          <ol className="mt-4 space-y-3">
            {treatments.map((treatment) => (
              <li key={treatment.id} className="flex flex-col gap-3 rounded-xl border border-[#d4c7b4] bg-white/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{treatment.name}</p>
                  <p className="text-sm text-[#6d6a66]">{treatmentTypeLabels[treatment.type]} · {formatDate(treatment.date)}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => edit(treatment)} aria-label={`Edit ${treatment.name}`} title={`Edit ${treatment.name}`} className="rounded-md p-2 text-gray-700 hover:bg-gray-100"><FontAwesomeIcon icon={faPen} /></button>
                  <button type="button" onClick={() => remove(treatment.id)} disabled={actionId === treatment.id} aria-label={`Delete ${treatment.name}`} title={`Delete ${treatment.name}`} className="rounded-md p-2 text-red-700 hover:bg-red-50 disabled:opacity-50"><FontAwesomeIcon icon={faTrash} /></button>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
