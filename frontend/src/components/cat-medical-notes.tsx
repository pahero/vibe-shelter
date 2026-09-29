"use client";

import { FormEvent, useEffect, useState } from "react";
import { CatMedicalNote, catsApi, MedicalNoteInput } from "@/lib/api";
import { CatProfileSectionHeader } from "@/components/cat-profile-section-header";
import { ApiErrorHandler, formatDate } from "@/lib/utils";

const today = () => new Date().toISOString().slice(0, 10);
const emptyNote = (): MedicalNoteInput => ({ date: today(), comment: "" });

export function CatMedicalNotes({ catId, onChanged }: { catId: string; onChanged?: () => Promise<void> }) {
  const [notes, setNotes] = useState<CatMedicalNote[]>([]);
  const [form, setForm] = useState<MedicalNoteInput>(emptyNote);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refresh = async () => setNotes(await catsApi.listMedicalNotes(catId));

  useEffect(() => { let cancelled = false; catsApi.listMedicalNotes(catId).then((items) => { if (!cancelled) setNotes(items); }).catch((reason: unknown) => { if (!cancelled) setError(ApiErrorHandler.handle(reason)); }).finally(() => { if (!cancelled) setIsLoading(false); }); return () => { cancelled = true; }; }, [catId]);
  const reset = () => { setEditingId(null); setForm(emptyNote()); setIsFormOpen(false); setError(null); };
  const add = () => { setEditingId(null); setForm(emptyNote()); setError(null); setIsFormOpen(true); setIsExpanded(true); };
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!form.date || !form.comment.trim()) { setError("Enter a date and comment."); return; } setIsSaving(true); setError(null); try { const payload = { ...form, comment: form.comment.trim() }; if (editingId) await catsApi.updateMedicalNote(editingId, payload); else await catsApi.createMedicalNote(catId, payload); await refresh(); await onChanged?.(); reset(); } catch (reason) { setError(ApiErrorHandler.handle(reason)); } finally { setIsSaving(false); } };
  const edit = (note: CatMedicalNote) => { setEditingId(note.id); setForm({ date: note.date, comment: note.comment }); setError(null); setIsFormOpen(true); setIsExpanded(true); };
  const remove = async (noteId: string) => { setActionId(noteId); setError(null); try { await catsApi.deleteMedicalNote(noteId); await refresh(); await onChanged?.(); if (editingId === noteId) reset(); } catch (reason) { setError(ApiErrorHandler.handle(reason)); } finally { setActionId(null); } };

  return <section className="overflow-hidden md:col-span-2 rounded-[22px] border border-[#d4c7b4] bg-[#fff8ee]/85 p-6 shadow-panel backdrop-blur-sm">
    <CatProfileSectionHeader title="Medical notes" isExpanded={isExpanded} onToggle={() => { if (isExpanded) reset(); setIsExpanded((current) => !current); }} onAdd={add} addLabel="Add medical note" />
    {isExpanded && <>
      {isFormOpen && <form onSubmit={submit} className="mt-3 grid gap-3 rounded-xl border border-[#d4c7b4] bg-white/50 p-4"><label className="grid gap-1 text-sm font-medium text-gray-800"><span>Date <span className="text-red-700">*</span></span><input aria-label="Medical note date" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="rounded-lg border border-[#d4c7b4] bg-white px-3 py-2" /></label><label className="grid gap-1 text-sm font-medium text-gray-800"><span>Comment <span className="text-red-700">*</span></span><textarea aria-label="Medical note comment" value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} rows={3} className="resize-y rounded-lg border border-[#d4c7b4] bg-white px-3 py-2" /></label><div className="flex gap-2"><button disabled={isSaving} className="rounded-xl bg-[#d05a2c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{isSaving ? "Saving..." : "Save"}</button><button type="button" onClick={reset} className="rounded-xl border border-[#d4c7b4] px-4 py-2 text-sm font-semibold">Cancel</button></div></form>}
      {error && <p className="mt-3 text-sm font-medium text-red-700">{error}</p>}
      {isLoading && <p className="mt-4 text-sm text-[#6d6a66]">Loading medical notes...</p>}
      {!isLoading && notes.length === 0 && <p className="mt-4 rounded-xl border border-dashed border-[#d4c7b4] p-4 text-sm text-[#6d6a66]">No medical notes yet.</p>}
      <ol className="mt-4 space-y-3">{notes.map((note) => <li key={note.id} className="rounded-xl border border-[#d4c7b4] bg-white/60 p-4"><div className="flex items-start justify-between gap-3"><div><time className="font-mono text-xs uppercase tracking-[0.1em] text-[#6d6a66]">{formatDate(note.date)}</time><p className="mt-1 whitespace-pre-wrap break-words text-gray-900">{note.comment}</p></div><div className="flex shrink-0 gap-1"><button type="button" onClick={() => edit(note)} aria-label="Edit medical note" title="Edit medical note" className="rounded-lg p-2 text-amber-700 hover:bg-amber-100">РІСљР‹</button><button type="button" disabled={actionId === note.id} onClick={() => void remove(note.id)} aria-label="Delete medical note" title="Delete medical note" className="rounded-lg p-2 text-red-700 hover:bg-red-100 disabled:opacity-50">СЂСџвЂ”вЂ</button></div></div></li>)}</ol>
    </>}
  </section>;
}
