"use client";

import { FormEvent, useState } from "react";
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
    <section className="w-full max-w-6xl rounded-[22px] border border-[#d4c7b4] bg-[#fff8ee]/85 p-6 shadow-panel backdrop-blur-sm md:p-8">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#d05a2c]">My user</p>
      <h1 className="mt-2 text-3xl font-semibold text-gray-900">{user.fullName || user.email}</h1>
      <p className="mt-1 text-sm text-[#6d6a66]">{user.email}</p>

      <section className="mt-6 rounded-2xl border border-[#d4c7b4] bg-white/55 p-4 md:p-6">
        <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-[#d05a2c]">Changing the password</h2>
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
        <button type="submit" disabled={isSaving} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#b24a20] bg-[#d05a2c] px-5 text-sm font-semibold text-white disabled:opacity-60">
          {isSaving ? "Saving password..." : "Change password"}
        </button>
        </form>
      </section>
    </section>
  );
}
