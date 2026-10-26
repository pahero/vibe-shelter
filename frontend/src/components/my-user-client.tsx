"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { AuthUser, changePassword } from "@/lib/backend";

type MyUserClientProps = {
  user: AuthUser;
};

export function MyUserClient({ user }: MyUserClientProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (newPassword !== newPasswordConfirmation) {
      setError("New passwords do not match.");
      return;
    }

    setIsSaving(true);
    try {
      await changePassword({ currentPassword, newPassword, newPasswordConfirmation });
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirmation("");
      setMessage("Password changed successfully.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to change password.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Link href="/" aria-label="Back to cats" title="Back to cats" className="fixed left-8 top-10 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-[#d4c7b4] bg-[#fff8ee]/90 text-[#d05a2c] shadow-md backdrop-blur-sm transition hover:bg-white hover:text-[#b24a20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d05a2c]"><FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" /></Link>
      <main className="mx-auto mt-2 w-full max-w-xl">
      <h1 className="text-2xl font-semibold text-gray-900">My profile</h1>
      <p className="mt-2 font-medium text-[#1f2320]">{user.fullName || user.email}</p>
      {user.fullName && <p className="mt-1 text-sm text-[#6d6a66]">{user.email}</p>}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Changing the password</h2>
        <form className="mt-4 grid max-w-xl gap-4" onSubmit={submit}>
        {error && <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800" role="alert">{error}</p>}
        {message && <p className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm font-medium text-green-800" role="status">{message}</p>}
        <label className="grid gap-1 text-sm font-semibold text-[#1f2320]">
          Current password
          <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required className="min-h-11 rounded-xl border border-[#d4c7b4] bg-white px-3 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-[#1f2320]">
          New password
          <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={8} className="min-h-11 rounded-xl border border-[#d4c7b4] bg-white px-3 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-[#1f2320]">
          Repeat new password
          <input type="password" value={newPasswordConfirmation} onChange={(event) => setNewPasswordConfirmation(event.target.value)} required minLength={8} className="min-h-11 rounded-xl border border-[#d4c7b4] bg-white px-3 font-normal" />
        </label>
        <button type="submit" disabled={isSaving} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#d05a2c] px-4 text-sm font-semibold text-white transition hover:bg-[#b24a20] disabled:cursor-not-allowed disabled:opacity-60">
          {isSaving ? "Saving password..." : "Change password"}
        </button>
        </form>
      </section>
      </main>
    </>
  );
}
