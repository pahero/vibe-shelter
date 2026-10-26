"use client";

import { FormEvent, startTransition, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { PaginationControls } from "@/components/pagination-controls";
import { AdminUser, createAdminUser, fetchAdminUsers, setAdminUserTemporaryPassword, setAdminUserTestStatus } from "@/lib/backend";

type FormState = {
  email: string;
  fullName: string;
  role: "admin" | "staff";
  isTest: boolean;
};

type UserRegistrationClientProps = {
  initialUsers?: AdminUser[];
};

const emptyForm: FormState = {
  email: "",
  fullName: "",
  role: "staff",
  isTest: false,
};
const usersPageSize = 20;

function generateTemporaryPassword(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...randomBytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function UserRegistrationClient({ initialUsers }: UserRegistrationClientProps) {
  const [users, setUsers] = useState(initialUsers ?? []);
  const [isLoadingUsers, setIsLoadingUsers] = useState(initialUsers === undefined);
  const [usersError, setUsersError] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | "form", string>>>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [isPasswordCopied, setIsPasswordCopied] = useState(false);
  const [isUpdatingTemporaryPassword, setIsUpdatingTemporaryPassword] = useState(false);
  const [resettingPasswordUserId, setResettingPasswordUserId] = useState<string | null>(null);
  const [updatingTestStatusUserId, setUpdatingTestStatusUserId] = useState<string | null>(null);
  const [usersPage, setUsersPage] = useState(1);

  useEffect(() => {
    if (initialUsers !== undefined) return;

    let cancelled = false;
    async function loadUsers() {
      try {
        const loadedUsers = await fetchAdminUsers();
        if (!cancelled) setUsers(loadedUsers);
      } catch (error) {
        if (!cancelled) setUsersError(error instanceof Error ? error.message : "Unable to load users");
      } finally {
        if (!cancelled) setIsLoadingUsers(false);
      }
    }

    void loadUsers();
    return () => {
      cancelled = true;
    };
  }, [initialUsers]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    setSuccessMessage("");
    setGeneratedPassword("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const password = generateTemporaryPassword();
      const created = await createAdminUser({
        email: form.email.trim(),
        fullName: form.fullName.trim() || undefined,
        role: form.role,
        status: "active",
        password,
        isTest: form.isTest,
      });

      startTransition(() => {
        setUsers((currentUsers) => [{ ...created, passwordChangeRequired: true }, ...currentUsers.filter((user) => user.id !== created.id)]);
        setForm(emptyForm);
        setErrors({});
        setSuccessMessage(`Temporary password for ${created.email} is:`);
        setGeneratedPassword(password);
        setIsPasswordCopied(false);
        setIsRegistrationOpen(false);
      });
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : "User registration failed" });
    } finally {
      setIsSubmitting(false);
    }
  }

  function closeRegistrationForm() {
    setIsRegistrationOpen(false);
    setForm(emptyForm);
    setErrors({});
    setSuccessMessage("");
  }

  async function resetUserPassword(user: AdminUser) {
    const password = generateTemporaryPassword();
    setIsUpdatingTemporaryPassword(true);
    setResettingPasswordUserId(user.id);
    setSuccessMessage("");
    setGeneratedPassword("");
    setIsPasswordCopied(false);
    try {
      await setAdminUserTemporaryPassword(user.id, password);
      setUsers((currentUsers) => currentUsers.map((currentUser) => currentUser.id === user.id ? { ...currentUser, passwordChangeRequired: true } : currentUser));
      setGeneratedPassword(password);
      setSuccessMessage(`Temporary password for ${user.email} is:`);
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : "Unable to reset the password.");
    } finally {
      setIsUpdatingTemporaryPassword(false);
      setResettingPasswordUserId(null);
    }
  }

  async function copyGeneratedPassword() {
    await navigator.clipboard.writeText(generatedPassword);
    setIsPasswordCopied(true);
  }

  async function toggleTestStatus(user: AdminUser) {
    setUpdatingTestStatusUserId(user.id);
    setSuccessMessage("");
    setUsersError("");
    try {
      const updatedUser = await setAdminUserTestStatus(user.id, !user.isTest);
      setUsers((currentUsers) => currentUsers.map((current) => current.id === updatedUser.id ? updatedUser : current));
      setSuccessMessage(`${updatedUser.email} is now ${updatedUser.isTest ? "a test user" : "not a test user"}.`);
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : "Unable to update user type.");
    } finally {
      setUpdatingTestStatusUserId(null);
    }
  }
  function updateField<Key extends keyof FormState>(field: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <section className="w-full max-w-6xl">
      {isRegistrationOpen && <div className="rounded-[28px] border border-[#d4c7b4] bg-[#fff8ee]/90 p-5 shadow-panel md:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#b24a20]">Admin</p>
        <h1 className="text-2xl font-semibold text-gray-900">Register a user</h1>
        <p className="mt-2 text-sm leading-6 text-[#6d6a66]">
              Create an active shelter account and generate a temporary password automatically.
        </p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          {errors.form ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
              {errors.form}
            </p>
          ) : null}
          {successMessage ? (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700" role="status">
              {successMessage}
            </p>
          ) : null}

          <label className="flex flex-col gap-2 text-sm font-semibold text-[#1f2320]">
            Email
            <input
              className="min-h-11 rounded-xl border border-[#d4c7b4] bg-white px-3 text-base font-normal outline-none transition focus:border-[#d05a2c] focus:ring-2 focus:ring-[#ffd4bf]"
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {errors.email ? <span id="email-error" className="text-sm font-medium text-red-700">{errors.email}</span> : null}
          </label>

          <label className="flex flex-col gap-2 text-sm font-semibold text-[#1f2320]">
            Full name
            <input
              className="min-h-11 rounded-xl border border-[#d4c7b4] bg-white px-3 text-base font-normal outline-none transition focus:border-[#d05a2c] focus:ring-2 focus:ring-[#ffd4bf]"
              type="text"
              value={form.fullName}
              onChange={(event) => updateField("fullName", event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-semibold text-[#1f2320]">
            Role
            <select
              className="min-h-11 rounded-xl border border-[#d4c7b4] bg-white px-3 text-base font-normal outline-none transition focus:border-[#d05a2c] focus:ring-2 focus:ring-[#ffd4bf]"
              value={form.role}
              onChange={(event) => updateField("role", event.target.value as FormState["role"])}
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-[#1f2320]">
            <input type="checkbox" checked={form.isTest} onChange={(event) => updateField("isTest", event.target.checked)} className="h-4 w-4 rounded border-[#d4c7b4] accent-[#d05a2c]" />
            Test user
          </label>

          <div className="mt-2 flex gap-2">
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#d05a2c] px-4 text-sm font-semibold text-white transition hover:bg-[#b24a20] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Registering..." : "Register user"}
          </button>
          <button type="button" onClick={closeRegistrationForm} disabled={isSubmitting} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#d4c7b4] bg-white px-4 text-sm font-semibold text-[#1f2320] transition hover:bg-[#fff8ee] disabled:cursor-not-allowed disabled:opacity-60">Cancel</button>
          </div>
        </form>
      </div>}

      {!isRegistrationOpen && <div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Users</h2>
          </div>
          <div className="flex items-center gap-3">
            {!isRegistrationOpen && <button type="button" onClick={() => setIsRegistrationOpen(true)} aria-label="Register user" title="Register user" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#b24a20] bg-[#d05a2c] text-white transition hover:bg-[#b24a20]"><FontAwesomeIcon icon={faPlus} aria-hidden="true" /></button>}
          </div>
        </div>

        {successMessage ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700" role="status">
            <p>{successMessage}</p>
            {generatedPassword && <div className="mt-2 flex flex-wrap items-center gap-3">
              <code className="select-all break-all rounded-lg border border-emerald-200 bg-white px-3 py-2 font-mono text-base font-semibold text-emerald-900">{generatedPassword}</code>
              <button type="button" onClick={() => void copyGeneratedPassword()} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-emerald-300 bg-white px-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100">{isPasswordCopied ? "Copied" : "Copy password"}</button>
            </div>}
          </div>
        ) : null}

        {isLoadingUsers ? (
          <p className="mt-6 text-sm text-[#6d6a66]">Loading users...</p>
        ) : usersError ? (
          <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{usersError}</p>
        ) : users.length === 0 ? (
          <p className="mt-6 text-sm text-[#6d6a66]">
            No users are registered yet. New registrations will appear here immediately.
          </p>
        ) : (
          <ul className="mt-4 grid gap-2">
            {users.slice((usersPage - 1) * usersPageSize, usersPage * usersPageSize).map((user) => (
              <li key={user.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 rounded-xl border border-[#d4c7b4] bg-white/70 p-4">
                <div className="grid min-w-0 grid-rows-3 gap-1">
                  <p className="truncate font-semibold text-[#1f2320]">{user.fullName || "—"}</p>
                  <p className="truncate text-sm text-[#6d6a66]">{user.email}</p>
                  <p className="truncate text-xs uppercase tracking-[0.18em] text-[#8b8379]">
                    {user.role} / {user.status}
                  </p>
                </div>
                <div className="grid justify-items-end gap-1">
                  <button type="button" onClick={() => void toggleTestStatus(user)} disabled={updatingTestStatusUserId === user.id || isUpdatingTemporaryPassword} className="text-right text-sm font-semibold text-[#b24a20] hover:text-[#8f3b19] disabled:opacity-50">
                    {updatingTestStatusUserId === user.id ? "Updating..." : `Mark ${user.isTest ? "non-test" : "test"}`}
                  </button>
                  {user.passwordChangeRequired ? <span className="text-right text-xs font-medium text-amber-800">Temporary password required</span> : <span aria-hidden="true" />}
                  <button type="button" onClick={() => void resetUserPassword(user)} disabled={isUpdatingTemporaryPassword} className="text-right text-sm font-semibold text-[#b24a20] hover:text-[#8f3b19] disabled:opacity-50">{resettingPasswordUserId === user.id ? "Generating..." : "Reset password"}</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {!isLoadingUsers && !usersError && <PaginationControls page={usersPage} pageSize={usersPageSize} totalItems={users.length} onPageChange={setUsersPage} />}
      </div>}</section>
  );
}

function validateForm(form: FormState): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};

  if (!form.email.trim()) {
    errors.email = "Email is required.";
  }

  return errors;
}
