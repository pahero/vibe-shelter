import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { AuthUser } from "@/lib/backend";

type AppHeaderProps = {
  user: AuthUser | null;
};

export function AppHeader({ user }: AppHeaderProps) {
  const navLinks = user?.role === "admin" ? [{ href: "/edit-shelter", label: "Edit shelter" }] : [];

  return (
    <header className="w-full max-w-6xl animate-rise rounded-[22px] border border-[#d4c7b4] bg-[#fff8ee]/85 px-5 py-4 shadow-panel backdrop-blur-sm md:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Link
          href="/"
          className="inline-flex w-fit rounded-full border border-[#d05a2c]/25 bg-[#d05a2c]/10 px-3 py-1 font-mono text-xs uppercase tracking-[0.18em] text-[#d05a2c] transition hover:bg-[#d05a2c]/15"
        >
          Friends of Larnaca cats
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <nav aria-label="Primary navigation" className="flex flex-wrap gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex min-h-10 items-center rounded-xl border border-[#d4c7b4] bg-white/45 px-3 text-sm font-semibold text-[#1f2320] transition hover:-translate-y-px hover:bg-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {user ? (
            <div className="flex flex-wrap items-center gap-2 border-[#d4c7b4] sm:border-l sm:pl-3">
              <span className="max-w-48 truncate text-sm text-[#6d6a66]" title={user.fullName || user.email}>
                {user.fullName || user.email}
              </span>
              <LogoutButton />
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#b24a20] bg-[#d05a2c] px-4 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-[#b24a20]"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
