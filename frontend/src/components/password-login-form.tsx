"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BACKEND_URL, type AuthUser } from "@/lib/backend";
import Script from "next/script";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

type PasswordLoginFormProps = {
  nextPath?: string;
};

export function PasswordLoginForm({ nextPath = "/" }: PasswordLoginFormProps) {
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [isRecaptchaReady, setIsRecaptchaReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    document.body.classList.add("show-recaptcha-badge");
    return () => document.body.classList.remove("show-recaptcha-badge");
  }, []);

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

      const user = (await response.json()) as AuthUser;
      router.push(user.passwordChangeRequired ? "/replace-temporary-password" : nextPath);
    } catch {
      setErrorMessage("Unable to sign in");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onForgotPassword() {
    setResetMessage(null);
    if (!email.trim()) {
      setErrorMessage("Enter your email address first.");
      return;
    }
    if (!isRecaptchaReady || !window.grecaptcha) {
      setErrorMessage("CAPTCHA is unavailable. Please try again later.");
      return;
    }

    setIsResettingPassword(true);
    setErrorMessage(null);
    try {
      const captchaToken = await new Promise<string>((resolve, reject) => {
        window.grecaptcha?.ready(() => {
          window.grecaptcha?.execute(recaptchaSiteKey, { action: "forgot_password" }).then(resolve, reject);
        });
      });
      const response = await fetch(`${BACKEND_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, captchaToken }),
      });
      if (!response.ok) {
        setErrorMessage("Unable to request a password reset. Please try again.");
        return;
      }
      const body = (await response.json()) as { message?: string };
      setResetMessage(body.message ?? "If an eligible account exists, a temporary password has been emailed.");
    } catch {
      setErrorMessage("Unable to request a password reset. Please try again.");
    } finally {
      setIsResettingPassword(false);
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

      <button
        className="justify-self-start text-sm font-medium text-[#9e421f] underline decoration-[#d4c7b4] underline-offset-4 hover:text-[#7f2d11] disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        onClick={onForgotPassword}
        disabled={isResettingPassword || isSubmitting}
      >
        {isResettingPassword ? "Requesting reset..." : "Forgot password?"}
      </button>

      {resetMessage ? (
        <div className="rounded-xl border border-[#9caa7b] bg-[#f2f5e9] px-3 py-2.5 text-sm text-[#46552e]" role="status">
          {resetMessage}
        </div>
      ) : null}

      {recaptchaSiteKey ? (
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`}
          strategy="afterInteractive"
          onReady={() => setIsRecaptchaReady(true)}
          onError={() => setIsRecaptchaReady(false)}
        />
      ) : null}

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
