"use client";

import { FormEvent, startTransition, useState } from "react";
import { AdminUser, createAdminUser } from "@/lib/backend";

type MarkerValue = "" | "true" | "false";

type FormState = {
  email: string;
  fullName: string;
  role: "admin" | "staff";
  status: "active" | "inactive";
  password: string;
  isTest: MarkerValue;
};

type UserRegistrationClientProps = {
  initialUsers: AdminUser[];
};

const emptyForm: FormState = {
  email: "",
  fullName: "",
  role: "staff",
  status: "active",
  password: "",
  isTest: "",
};

export function UserRegistrationClient({ initialUsers }: UserRegistrationClientProps) {
  const [users, setUsers] = useState(initialUsers);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | "form", string>>>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    setSuccessMessage("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createAdminUser({
        email: form.email.trim(),
        fullName: form.fullName.trim() || undefined,
        role: form.role,
        status: form.status,
        password: form.password,
        isTest: form.isTest === "true",
      });

      startTransition(() => {
        setUsers((currentUsers) => [created, ...currentUsers.filter((user) => user.id !== created.id)]);
        setForm(emptyForm);
        setErrors({});
        setSuccessMessage(`${created.email} was registered successfully.`);
      });
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : "User registration failed" });
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateField<Key extends keyof FormState>(field: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <section className="grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.35fr)]">
      <div className="rounded-[28px] border border-[#d4c7b4] bg-[#fff8ee]/90 p-5 shadow-panel md:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#b24a20]">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#1f2320]">Register a user</h1>
        <p className="mt-2 text-sm leading-6 text-[#6d6a66]">
          Create shelter accounts with a password and an explicit test-user marker.
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

          <div className="grid gap-4 sm:grid-cols-2">
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

            <label className="flex flex-col gap-2 text-sm font-semibold text-[#1f2320]">
              Status
              <select
                className="min-h-11 rounded-xl border border-[#d4c7b4] bg-white px-3 text-base font-normal outline-none transition focus:border-[#d05a2c] focus:ring-2 focus:ring-[#ffd4bf]"
                value={form.status}
                onChange={(event) => updateField("status", event.target.value as FormState["status"])}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-2 text-sm font-semibold text-[#1f2320]">
            Password
            <input
              className="min-h-11 rounded-xl border border-[#d4c7b4] bg-white px-3 text-base font-normal outline-none transition focus:border-[#d05a2c] focus:ring-2 focus:ring-[#ffd4bf]"
              type="password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              aria-describedby={errors.password ? "password-error" : undefined}
            />
            {errors.password ? <span id="password-error" className="text-sm font-medium text-red-700">{errors.password}</span> : null}
          </label>

          <fieldset className="rounded-2xl border border-[#d4c7b4] bg-white/60 p-4">
            <legend className="px-1 text-sm font-semibold text-[#1f2320]">Test user</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex min-h-11 items-center gap-3 rounded-xl border border-[#d4c7b4] bg-white px-3 text-sm font-medium text-[#1f2320]">
                <input
                  type="radio"
                  name="isTest"
                  value="true"
                  checked={form.isTest === "true"}
                  onChange={() => updateField("isTest", "true")}
                />
                Test user
              </label>
              <label className="flex min-h-11 items-center gap-3 rounded-xl border border-[#d4c7b4] bg-white px-3 text-sm font-medium text-[#1f2320]">
                <input
                  type="radio"
                  name="isTest"
                  value="false"
                  checked={form.isTest === "false"}
                  onChange={() => updateField("isTest", "false")}
                />
                Not a test user
              </label>
            </div>
            {errors.isTest ? <p className="mt-2 text-sm font-medium text-red-700">{errors.isTest}</p> : null}
          </fieldset>

          <button
            className="mt-2 inline-flex min-h-12 items-center justify-center rounded-xl border border-[#b24a20] bg-[#d05a2c] px-5 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-[#b24a20] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Registering..." : "Register user"}
          </button>
        </form>
      </div>

      <div className="rounded-[28px] border border-[#d4c7b4] bg-white/80 p-5 shadow-panel md:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#b24a20]">Current users</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-[#1f2320]">User list</h2>
          </div>
          <p className="text-sm text-[#6d6a66]">{users.length} registered</p>
        </div>

        {users.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-[#d4c7b4] bg-[#fff8ee] p-5 text-sm text-[#6d6a66]">
            No users are registered yet. New registrations will appear here immediately.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-[#eadccb] overflow-hidden rounded-2xl border border-[#eadccb] bg-[#fffaf4]">
            {users.map((user) => (
              <li key={user.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#1f2320]">{user.fullName || user.email}</p>
                  <p className="truncate text-sm text-[#6d6a66]">{user.email}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#8b8379]">
                    {user.role} / {user.status}
                  </p>
                </div>
                <span className={user.isTest ? "rounded-full bg-[#ffe1d4] px-3 py-1 text-sm font-semibold text-[#9a3f1c]" : "rounded-full bg-[#e8f4de] px-3 py-1 text-sm font-semibold text-[#3f6b28]"}>
                  {user.isTest ? "Test user" : "Not a test user"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function validateForm(form: FormState): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};

  if (!form.email.trim()) {
    errors.email = "Email is required.";
  }

  if (!form.password.trim()) {
    errors.password = "Password is required.";
  }

  if (!form.isTest) {
    errors.isTest = "Select whether this user is a test user.";
  }

  return errors;
}
