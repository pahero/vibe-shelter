import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { fetchCurrentUser } from "@/lib/backend";

export default async function DashboardPage() {
  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get("cookie") ?? "";
  const user = await fetchCurrentUser(cookieHeader);

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="grid min-h-screen w-full place-items-center p-6">
      <section className="w-full max-w-4xl animate-rise rounded-[22px] border border-[#d4c7b4] bg-[#fff8ee]/85 p-7 shadow-panel backdrop-blur-sm md:p-8">
        <p className="inline-block rounded-full border border-[#d05a2c]/25 bg-[#d05a2c]/10 px-3 py-1 font-mono text-xs uppercase tracking-[0.18em] text-[#d05a2c]">
          Authenticated
        </p>
        <h1 className="mt-2 text-4xl font-semibold leading-[1.03] tracking-[-0.03em] md:text-6xl">
          Welcome back{user.fullName ? `, ${user.fullName}` : ""}
        </h1>
        <p className="mt-3 max-w-[62ch] text-base leading-relaxed text-[#6d6a66] md:text-lg">
          Your session is valid and served by the NestJS auth backend.
        </p>

        <div className="mt-5 grid animate-rise gap-2.5 [animation-delay:120ms]">
          <div className="grid gap-1.5 rounded-xl border border-[#d4c7b4] bg-white/40 p-3">
            <span className="font-mono text-xs uppercase tracking-[0.1em] text-[#6d6a66]">
              Email
            </span>
            <span className="break-words text-base font-semibold">{user.email}</span>
          </div>
          <div className="grid gap-1.5 rounded-xl border border-[#d4c7b4] bg-white/40 p-3">
            <span className="font-mono text-xs uppercase tracking-[0.1em] text-[#6d6a66]">
              Role
            </span>
            <span className="break-words text-base font-semibold">{user.role}</span>
          </div>
          <div className="grid gap-1.5 rounded-xl border border-[#d4c7b4] bg-white/40 p-3">
            <span className="font-mono text-xs uppercase tracking-[0.1em] text-[#6d6a66]">
              User ID
            </span>
            <span className="break-words font-mono text-sm font-medium">{user.id}</span>
          </div>
        </div>

        <div className="mt-6 flex animate-rise flex-wrap gap-3 [animation-delay:220ms]">
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#b24a20] bg-[#d05a2c] px-4 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-[#b24a20]"
            href="/"
          >
            Home
          </Link>
          <LogoutButton />
        </div>
      </section>
    </main>
  );
}
