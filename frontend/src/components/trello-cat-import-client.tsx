"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { type DuplicateCatReference, catsApi } from "@/lib/api";
import { ApiErrorHandler } from "@/lib/utils";

export function TrelloCatImportClient() {
  const [trelloUrls, setTrelloUrls] = useState("");
  const [tagName, setTagName] = useState("");
  const [transferAdopterByColumnName, setTransferAdopterByColumnName] =
    useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    completed: number;
    total: number;
    currentUrl: string | null;
  } | null>(null);
  const [importResults, setImportResults] = useState<
    Array<{
      trelloUrl: string;
      cat: { id: string; name: string } | null;
      error: string | null;
      duplicateCat: DuplicateCatReference | null;
      skipped: boolean;
    }>
  >([]);
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [isImportingAttachments, setIsImportingAttachments] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [attachmentCatId, setAttachmentCatId] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const urls = [
      ...new Set(
        trelloUrls
          .split(/\r?\n/)
          .map((url) => url.trim())
          .filter(Boolean),
      ),
    ];
    if (urls.length === 0) return;
    setImportResults([]);
    setImportProgress({
      completed: 0,
      total: urls.length,
      currentUrl: urls[0],
    });
    setIsImporting(true);
    const results: typeof importResults = [];
    for (const [index, url] of urls.entries()) {
      try {
        const result = await catsApi.importTrelloCard(
          url,
          transferAdopterByColumnName,
          tagName.trim() || null,
        );
        const cat = await catsApi.getCatCard(result.id);
        results.push({
          trelloUrl: url,
          cat: { id: cat.id, name: cat.name },
          error: null,
          duplicateCat: null,
          skipped: false,
        });
      } catch (caught) {
        const duplicateCat = ApiErrorHandler.getDuplicateCat(caught);
        results.push({
          trelloUrl: url,
          cat: duplicateCat
            ? { id: duplicateCat.id, name: duplicateCat.name }
            : null,
          error: duplicateCat ? null : ApiErrorHandler.handle(caught),
          duplicateCat,
          skipped: duplicateCat !== null,
        });
      }
      setImportResults([...results]);
      setImportProgress({
        completed: index + 1,
        total: urls.length,
        currentUrl: urls[index + 1] ?? null,
      });
    }
    setIsImporting(false);
  }

  async function submitAttachments(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttachmentError(null);
    setAttachmentCatId(null);
    setIsImportingAttachments(true);
    try {
      const result = await catsApi.importTrelloAttachments(
        attachmentUrl.trim(),
      );
      setAttachmentCatId(result.id);
      setAttachmentUrl("");
    } catch (caught) {
      setAttachmentError(ApiErrorHandler.handle(caught));
    } finally {
      setIsImportingAttachments(false);
    }
  }

  return (
    <>
      <section className="w-full max-w-3xl rounded-2xl border border-[#d4c7b4] bg-white/80 p-6 shadow-panel">
        <h1 className="text-2xl font-bold text-[#1f2320]">
          Import cat from Trello
        </h1>
        <p className="mt-3 text-sm text-gray-700">
          Import cats and their details, vaccinations, photos, and documents
          from Trello, one card at a time. Paste one card URL per line.
        </p>
        <form
          onSubmit={(event) => void submit(event)}
          className="mt-6 space-y-4"
        >
          <label
            className="grid gap-1 text-sm font-semibold text-gray-800"
            htmlFor="trello-card-urls"
          >
            <span>
              Trello card URLs <span className="text-red-600">*</span>
            </span>
          </label>
          <textarea
            id="trello-card-urls"
            required
            rows={5}
            value={trelloUrls}
            onChange={(event) => setTrelloUrls(event.target.value)}
            placeholder={
              "https://trello.com/c/wqNVNDIs\nhttps://trello.com/c/anotherCard"
            }
            className="w-full resize-y rounded-xl border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
          />
          <label
            className="grid gap-1 text-sm font-semibold text-gray-800"
            htmlFor="trello-import-tag"
          >
            Tag to assign to imported cats
            <input
              id="trello-import-tag"
              type="text"
              maxLength={40}
              value={tagName}
              onChange={(event) => setTagName(event.target.value)}
              placeholder="Optional tag"
              className="w-full rounded-xl border border-[#d4c7b4] bg-white px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
            />
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-[#d4c7b4] bg-[#fff8ee] px-3 py-3 text-sm font-medium text-gray-900">
            <input
              type="checkbox"
              checked={transferAdopterByColumnName}
              onChange={(event) =>
                setTransferAdopterByColumnName(event.target.checked)
              }
              className="h-5 w-5 shrink-0 accent-[#d05a2c]"
            />
            Перенос adopter по имени столбца
          </label>
          <button
            type="submit"
            disabled={isImporting || !trelloUrls.trim()}
            className="min-h-11 rounded-xl bg-[#d05a2c] px-5 font-semibold text-white hover:bg-[#b24a20] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isImporting
              ? `Importing ${importProgress?.completed ?? 0}/${importProgress?.total ?? 0}…`
              : "Import cats"}
          </button>
        </form>
        {importProgress && (
          <div className="mt-4 space-y-2">
            <div
              role="progressbar"
              aria-label="Trello import progress"
              aria-valuemin={0}
              aria-valuemax={importProgress.total}
              aria-valuenow={importProgress.completed}
              className="h-3 overflow-hidden rounded-full bg-[#eadfce]"
            >
              <div
                className="h-full rounded-full bg-[#d05a2c] transition-[width]"
                style={{
                  width: `${(importProgress.completed / importProgress.total) * 100}%`,
                }}
              />
            </div>
            <p role="status" className="text-sm text-gray-700">
              {isImporting
                ? `Imported ${importProgress.completed} of ${importProgress.total}. ${importProgress.currentUrl ? `${importProgress.completed === 0 ? "Current" : "Next"}: ${importProgress.currentUrl}` : ""}`
                : `Finished: ${importResults.filter((result) => result.cat && !result.skipped).length} imported, ${importResults.filter((result) => result.skipped).length} skipped, ${importResults.filter((result) => result.error).length} failed.`}
            </p>
          </div>
        )}
        {importResults.length > 0 && (
          <ul aria-label="Trello import results" className="mt-4 space-y-2">
            {importResults.map((result) => (
              <li
                key={result.trelloUrl}
                className={`rounded-lg p-3 text-sm ${result.error ? "bg-red-100 text-red-800" : result.skipped ? "bg-amber-100 text-amber-900" : "bg-green-100 text-green-900"}`}
              >
                {result.error ? (
                  <>
                    <span role="alert">
                      {result.trelloUrl}: {result.error}
                    </span>
                    {result.duplicateCat && (
                      <>
                        {" "}
                        <Link
                          className="font-semibold underline"
                          href={`/cats/${result.duplicateCat.id}`}
                        >
                          View {result.duplicateCat.name}
                          {result.duplicateCat.nameNumber > 1
                            ? ` #${result.duplicateCat.nameNumber}`
                            : ""}
                        </Link>
                      </>
                    )}
                  </>
                ) : result.skipped && result.duplicateCat ? (
                  <>
                    Already imported, skipped: {result.duplicateCat.name}
                    {result.duplicateCat.nameNumber > 1
                      ? ` #${result.duplicateCat.nameNumber}`
                      : ""}
                    .{" "}
                    <Link
                      className="font-semibold underline"
                      href={`/cats/${result.duplicateCat.id}`}
                    >
                      View {result.duplicateCat.name}
                      {result.duplicateCat.nameNumber > 1
                        ? ` #${result.duplicateCat.nameNumber}`
                        : ""}
                    </Link>
                  </>
                ) : (
                  <>
                    {result.cat?.name} was imported.{" "}
                    <Link
                      className="font-semibold underline"
                      href={`/cats/${result.cat?.id}`}
                    >
                      View cat
                    </Link>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="w-full max-w-3xl rounded-2xl border border-[#d4c7b4] bg-white/80 p-6 shadow-panel">
        <h2 className="text-xl font-bold text-[#1f2320]">
          Replace existing photos and documents
        </h2>
        <p className="mt-3 text-sm text-gray-700">
          Replace all current photos and documents on the cat linked to this
          Trello card with its successfully imported attachments.
        </p>
        <form
          onSubmit={(event) => void submitAttachments(event)}
          className="mt-6 space-y-4"
        >
          <label
            className="grid gap-1 text-sm font-semibold text-gray-800"
            htmlFor="existing-cat-trello-card-url"
          >
            <span>
              Existing cat’s Trello card URL{" "}
              <span className="text-red-600">*</span>
            </span>
          </label>
          <input
            id="existing-cat-trello-card-url"
            type="url"
            required
            value={attachmentUrl}
            onChange={(event) => setAttachmentUrl(event.target.value)}
            placeholder="https://trello.com/c/wqNVNDIs"
            className="w-full rounded-xl border border-[#d4c7b4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d05a2c]"
          />
          <button
            type="submit"
            disabled={isImportingAttachments || !attachmentUrl.trim()}
            className="min-h-11 rounded-xl border border-[#d4c7b4] bg-white px-5 font-semibold text-[#333832] hover:bg-[#fff8ee] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isImportingAttachments
              ? "Importing attachments…"
              : "Replace files with Trello attachments"}
          </button>
        </form>
        {attachmentError && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-red-100 p-3 text-sm text-red-800"
          >
            {attachmentError}
          </p>
        )}
        {attachmentCatId && (
          <p
            role="status"
            className="mt-4 rounded-lg bg-green-100 p-3 text-sm text-green-900"
          >
            Photos and documents were replaced with Trello attachments.{" "}
            <Link
              className="font-semibold underline"
              href={`/cats/${attachmentCatId}`}
            >
              View cat
            </Link>
          </p>
        )}
      </section>
    </>
  );
}
