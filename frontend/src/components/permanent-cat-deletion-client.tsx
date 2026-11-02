"use client";

import { FormEvent, useState } from "react";
import { BACKEND_URL, authenticatedFetch } from "@/lib/backend";

export function PermanentCatDeletionClient() {
  const [text, setText] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<number | null>(null);
  const ids = [
    ...new Set(
      text
        .split(/\r?\n/)
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ids.length || ids.length > 100 || confirmation !== "DELETE") return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const response = await authenticatedFetch(
        `${BACKEND_URL}/api/cats/permanent`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        },
      );
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        const message =
          body &&
          typeof body === "object" &&
          "message" in body &&
          typeof body.message === "string"
            ? body.message
            : "Cat deletion failed.";
        throw new Error(message);
      }
      const body: unknown = await response.json();
      const count =
        body &&
        typeof body === "object" &&
        "deletedCount" in body &&
        typeof body.deletedCount === "number"
          ? body.deletedCount
          : ids.length;
      setResult(count);
      setText("");
      setConfirmation("");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Cat deletion failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="w-full max-w-3xl rounded-2xl border border-red-300 bg-white/80 p-6 shadow-panel">
      <h1 className="text-2xl font-bold text-red-800">
        Permanently delete cats
      </h1>
      <p className="mt-3 text-sm text-gray-800">
        This irreversible action permanently deletes each selected cat and its
        associated medical records, tasks, notes, photos, documents, audit
        history, and flight assignments. Stored photo and document files are
        also removed.
      </p>
      <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-4">
        <label className="block text-sm font-semibold" htmlFor="cat-ids">
          Cat IDs, one per line <span className="text-red-600">*</span>
        </label>
        <textarea
          id="cat-ids"
          required
          rows={8}
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="w-full rounded-xl border border-[#d4c7b4] bg-white p-3 font-mono text-sm"
          placeholder="Paste cat IDs here, one per line"
        />
        <p className="text-xs text-gray-600">
          {ids.length} unique ID{ids.length === 1 ? "" : "s"} entered (maximum
          100).
        </p>
        <label className="block text-sm font-semibold" htmlFor="delete-confirm">
          Type DELETE to confirm <span className="text-red-600">*</span>
        </label>
        <input
          id="delete-confirm"
          required
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          className="w-full rounded-xl border border-red-300 p-3"
          autoComplete="off"
        />
        <button
          disabled={
            busy || !ids.length || ids.length > 100 || confirmation !== "DELETE"
          }
          className="min-h-11 rounded-xl bg-red-700 px-5 font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy
            ? "Deleting…"
            : `Permanently delete ${ids.length || "selected"} cat${ids.length === 1 ? "" : "s"}`}
        </button>
      </form>
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-100 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {result !== null && (
        <p
          role="status"
          className="mt-4 rounded-lg bg-green-100 p-3 text-sm text-green-900"
        >
          Permanently deleted {result} cat{result === 1 ? "" : "s"}.
        </p>
      )}
    </section>
  );
}
