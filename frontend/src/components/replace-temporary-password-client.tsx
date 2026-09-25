"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { replaceTemporaryPassword } from "@/lib/backend";

export function ReplaceTemporaryPasswordClient() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (newPassword !== newPasswordConfirmation) {
      setError("New passwords do not match.");
      return;
    }

    setIsSaving(true);
    try {
      await replaceTemporaryPassword({ newPassword, newPasswordConfirmation });
      router.replace("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create a permanent password.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="w-full max-w-md rounded-[22px] border border-[#d4c7b4] bg-[#fff8ee]/90 p-6 shadow-panel" onSubmit={submit}>
      <h1 className="text-2xl font-semibold text-[#1f2320]">Create a permanent password</h1>
      <p className="mt-2 text-sm text-[#6d6a66]">Set a new password to continue.</p>
      <div className="mt-6 grid gap-4">
        {error && <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800" role="alert">{error}</p>}
        <label className="grid gap-1 text-sm font-semibold text-[#1f2320]">
          New password
          <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={8} className="min-h-11 rounded-xl border border-[#d4c7b4] bg-white px-3 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-[#1f2320]">
          Repeat new password
          <input type="password" value={newPasswordConfirmation} onChange={(event) => setNewPasswordConfirmation(event.target.value)} required minLength={8} className="min-h-11 rounded-xl border border-[#d4c7b4] bg-white px-3 font-normal" />
        </label>
        <button type="submit" disabled={isSaving} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#b24a20] bg-[#d05a2c] px-5 text-sm font-semibold text-white disabled:opacity-60">
          {isSaving ? "Saving password..." : "Continue"}
        </button>
      </div>
    </form>
  );
}
