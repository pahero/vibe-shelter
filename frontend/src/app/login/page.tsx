import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { AuthLinkButton } from "@/components/auth-link-button";
import { PasswordLoginForm } from "@/components/password-login-form";
import { BACKEND_URL, fetchCurrentUser } from "@/lib/backend";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get("cookie") ?? "";
  const user = await fetchCurrentUser(cookieHeader);

  if (user) {
    redirect("/dashboard");
  }

  const query = await searchParams;
  const authError = typeof query.error === "string" ? query.error : null;

  return (
    <main className="grid min-h-screen w-full place-items-center p-6">
      <section className="w-full max-w-4xl animate-rise rounded-[22px] border border-[#d4c7b4] bg-[#fff8ee]/85 p-7 shadow-panel backdrop-blur-sm md:p-8">
        <p className="inline-block rounded-full border border-[#d05a2c]/25 bg-[#d05a2c]/10 px-3 py-1 font-mono text-xs uppercase tracking-[0.18em] text-[#d05a2c]">
          Shelter Workspace
        </p>
        <h1 className="mt-2 text-4xl font-semibold leading-[1.03] tracking-[-0.03em] md:text-6xl">
          Sign in
        </h1>
        <p className="mt-3 max-w-[62ch] text-base leading-relaxed text-[#6d6a66] md:text-lg">
          Access is granted only to pre-created active users in the Shelter backend via
          password or Google sign-in.
        </p>

        <PasswordLoginForm />

        <div className="mt-6 flex items-center gap-3 text-sm text-[#6d6a66]">
          <span className="h-px flex-1 bg-[#d4c7b4]" />
          <span>or continue with</span>
          <span className="h-px flex-1 bg-[#d4c7b4]" />
        </div>

        {authError ? (
          <div
            className="mt-4 rounded-xl border border-[#d6754f] bg-[#fff0e8] px-3 py-2.5 text-[#7f2d11]"
            role="alert"
          >
            {authError}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-3">
          <AuthLinkButton href={`${BACKEND_URL}/auth/google`} label="Continue with Google" />
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#d4c7b4] px-4 text-sm font-semibold text-[#1f2320] transition hover:-translate-y-px hover:bg-black/5"
            href="/"
          >
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
