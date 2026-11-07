"use client";

import { useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { PermanentCatDeletionClient } from "@/components/permanent-cat-deletion-client";
import { TrelloCatImportClient } from "@/components/trello-cat-import-client";
import { BACKEND_URL, authenticatedFetch } from "@/lib/backend";

export function OwnerToolsClient() {
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  async function sendSentryTestError() {
    setIsTesting(true);
    setTestStatus(null);
    try {
      const response = await authenticatedFetch(
        `${BACKEND_URL}/api/sentry-test-error`,
      );
      const responseText = await response.text();
      if (response.ok) {
        setTestStatus("The test endpoint unexpectedly succeeded.");
        return;
      }

      const error = new Error(
        `Backend test endpoint returned ${response.status}: ${responseText}`,
      );
      Sentry.captureException(error, {
        tags: { test: "better-stack-backend-error" },
      });
      setTestStatus("The frontend test exception was sent to Better Stack.");
    } catch (error) {
      Sentry.captureException(error, {
        tags: { test: "better-stack-backend-fetch-error" },
      });
      setTestStatus("The frontend fetch exception was sent to Better Stack.");
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <div className="w-full space-y-6">
      <section className="space-y-3 rounded-xl border border-[#d4c7b4] bg-white/75 p-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Better Stack diagnostics
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Calls an owner-only backend endpoint that intentionally fails, then
            reports the frontend fetch failure to Better Stack.
          </p>
        </div>
        <button
          type="button"
          onClick={sendSentryTestError}
          disabled={isTesting}
          className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#d05a2c] px-4 text-sm font-semibold text-white transition hover:bg-[#b24a20] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isTesting ? "Sending test error..." : "Send Better Stack test error"}
        </button>
        {testStatus ? (
          <p className="text-sm font-medium text-[#46552e]" role="status">
            {testStatus}
          </p>
        ) : null}
      </section>
      <PermanentCatDeletionClient />
      <TrelloCatImportClient />
    </div>
  );
}
