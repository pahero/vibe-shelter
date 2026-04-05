"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BACKEND_URL } from "@/lib/backend";

export function PasswordLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${BACKEND_URL}/auth/login`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        let message = "Unable to sign in";
        try {
          const body = (await response.json()) as { message?: string | string[] };
          if (Array.isArray(body.message)) {
            message = body.message.join(", ");
          } else if (typeof body.message === "string") {
            message = body.message;
          }
        } catch {
          // Keep fallback message when response body is not JSON.
        }
        setErrorMessage(message);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setErrorMessage("Unable to sign in");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-6 grid gap-3" onSubmit={onSubmit}>
      <label className="grid gap-1.5">
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-[#6d6a66]">Email</span>
        <input
          className="min-h-11 rounded-xl border border-[#d4c7b4] bg-white/80 px-3 text-sm outline-none transition focus:border-[#d05a2c] focus:ring-2 focus:ring-[#d05a2c]/20"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </label>

      <label className="grid gap-1.5">
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-[#6d6a66]">Password</span>
        <input
          className="min-h-11 rounded-xl border border-[#d4c7b4] bg-white/80 px-3 text-sm outline-none transition focus:border-[#d05a2c] focus:ring-2 focus:ring-[#d05a2c]/20"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          minLength={8}
          required
        />
      </label>

      {errorMessage ? (
        <div
          className="rounded-xl border border-[#d6754f] bg-[#fff0e8] px-3 py-2.5 text-sm text-[#7f2d11]"
          role="alert"
        >
          {errorMessage}
        </div>
      ) : null}

      <button
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#b24a20] bg-[#d05a2c] px-4 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-[#b24a20] disabled:cursor-not-allowed disabled:opacity-70"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Signing in..." : "Sign in with Email"}
      </button>
    </form>
  );
}
