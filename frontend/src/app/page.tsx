import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthLinkButton } from "@/components/auth-link-button";
import { PasswordLoginForm } from "@/components/password-login-form";
import { BACKEND_URL, fetchCurrentUser } from "@/lib/backend";

export default async function Home() {
  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get("cookie") ?? "";
  const user = await fetchCurrentUser(cookieHeader);

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="grid min-h-screen w-full place-items-center p-6">
      <section className="w-full max-w-4xl animate-rise rounded-[22px] border border-[#d4c7b4] bg-[#fff8ee]/85 p-7 shadow-panel backdrop-blur-sm md:p-8">
        <p className="inline-block rounded-full border border-[#d05a2c]/25 bg-[#d05a2c]/10 px-3 py-1 font-mono text-xs uppercase tracking-[0.18em] text-[#d05a2c]">
          Shelter Platform
        </p>
        <h1 className="mt-2 text-4xl font-semibold leading-[1.03] tracking-[-0.03em] md:text-6xl">
          Operations at humane speed
        </h1>
        <p className="mt-3 max-w-[62ch] text-base leading-relaxed text-[#6d6a66] md:text-lg">
          Shelter runs on secure staff access only. Sign in with your approved account using
          Google SSO or plain email and password.
        </p>

        <PasswordLoginForm />

        <div className="mt-6 flex items-center gap-3 text-sm text-[#6d6a66]">
          <span className="h-px flex-1 bg-[#d4c7b4]" />
          <span>or continue with</span>
          <span className="h-px flex-1 bg-[#d4c7b4]" />
        </div>

        <div className="mt-6 flex animate-rise flex-wrap gap-3 [animation-delay:120ms]">
          <AuthLinkButton href={`${BACKEND_URL}/auth/google`} label="Sign in with Google" />
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#d4c7b4] px-4 text-sm font-semibold text-[#1f2320] transition hover:-translate-y-px hover:bg-black/5"
            href="/login"
          >
            Open full login page
          </Link>
        </div>

        <div className="mt-6 grid animate-rise grid-cols-1 gap-3 [animation-delay:220ms] md:grid-cols-3">
          <article className="rounded-2xl border border-[#d4c7b4] bg-white/35 p-3.5">
            <span className="block text-base font-bold">Flexible Sign-in</span>
            <span className="mt-1.5 block text-sm text-[#6d6a66]">Google SSO and password login</span>
          </article>
          <article className="rounded-2xl border border-[#d4c7b4] bg-white/35 p-3.5">
            <span className="block text-base font-bold">Role-based</span>
            <span className="mt-1.5 block text-sm text-[#6d6a66]">Admin and staff scopes</span>
          </article>
          <article className="rounded-2xl border border-[#d4c7b4] bg-white/35 p-3.5">
            <span className="block text-base font-bold">Session-backed</span>
            <span className="mt-1.5 block text-sm text-[#6d6a66]">Server-side access control</span>
          </article>
        </div>
      </section>
    </main>
  );
}
