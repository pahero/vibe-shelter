"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { type DuplicateCatReference, catsApi } from "@/lib/api";
import { ApiErrorHandler } from "@/lib/utils";

export function TrelloCatImportClient() {
  const [trelloUrl, setTrelloUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateCat, setDuplicateCat] =
    useState<DuplicateCatReference | null>(null);
  const [importedCat, setImportedCat] = useState<{
    id: string;
    name: string;
  } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setDuplicateCat(null);
    setImportedCat(null);
    setIsImporting(true);
    try {
      const result = await catsApi.importTrelloCard(trelloUrl.trim());
      const cat = await catsApi.getCatCard(result.id);
      setImportedCat({ id: cat.id, name: cat.name });
      setTrelloUrl("");
    } catch (caught) {
      setError(ApiErrorHandler.handle(caught));
      setDuplicateCat(ApiErrorHandler.getDuplicateCat(caught));
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <section className="w-full max-w-3xl rounded-2xl border border-[#d4c7b4] bg-white/80 p-6 shadow-panel">
      <h1 className="text-2xl font-bold text-[#1f2320]">
        Import cat from Trello
      </h1>
      <p className="mt-3 text-sm text-gray-700">
        Import a cat and its details, vaccinations, photos, and documents from a
        Trello card.
      </p>
      <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-4">
        <label
          className="grid gap-1 text-sm font-semibold text-gray-800"
          htmlFor="trello-card-url"
        >
          <span>
            Trello card URL <span className="text-red-600">*</span>
          </span>
        </label>
        <input
          id="trello-card-url"
          type="url"
          required
          value={trelloUrl}
          onChange={(event) => setTrelloUrl(event.target.value)}
          placeholder="https://trello.com/c/wqNVNDIs"
          className="w-full rounded-xl border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
        />
        <button
          type="submit"
          disabled={isImporting || !trelloUrl.trim()}
          className="min-h-11 rounded-xl bg-[#d05a2c] px-5 font-semibold text-white hover:bg-[#b24a20] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isImporting ? "Importing…" : "Import cat"}
        </button>
      </form>
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-100 p-3 text-sm text-red-800"
        >
          {error}
          {duplicateCat && (
            <>
              {" "}
              <Link
                className="font-semibold underline"
                href={`/cats/${duplicateCat.id}`}
              >
                View {duplicateCat.name}
                {duplicateCat.nameNumber > 1
                  ? ` #${duplicateCat.nameNumber}`
                  : ""}
              </Link>
            </>
          )}
        </p>
      )}
      {importedCat && (
        <p
          role="status"
          className="mt-4 rounded-lg bg-green-100 p-3 text-sm text-green-900"
        >
          {importedCat.name} was imported from Trello.{" "}
          <Link
            className="font-semibold underline"
            href={`/cats/${importedCat.id}`}
          >
            View cat
          </Link>
        </p>
      )}
    </section>
  );
}
