import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { AuthUser } from "@/lib/backend";
import { NotificationCenter } from "@/components/notification-center";

type AppHeaderProps = {
  user: AuthUser | null;
  hideEditShelterLink?: boolean;
};

export function AppHeader({ user, hideEditShelterLink = false }: AppHeaderProps) {
  if (user?.passwordChangeRequired) {
    redirect("/replace-temporary-password");
  }

  const navLinks =
    user?.role === "admin"
      ? [
           ...(hideEditShelterLink ? [] : [{ href: "/shelter-management", label: "Shelter management" }]),
        ]
      : [];

  return (
    <header className="relative z-50 w-full max-w-6xl animate-rise rounded-[22px] border border-[#d4c7b4] bg-[#fff8ee]/85 px-5 py-4 shadow-panel backdrop-blur-sm md:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Link
          href="/"
          className="inline-flex w-fit text-2xl font-semibold tracking-[-0.02em] text-[#d05a2c] transition hover:text-[#b24a20]"
        >
          Friends Of Larnaca Cats
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
              <NotificationCenter />
              <Link href="/my-user" className="max-w-48 truncate text-sm text-[#6d6a66] hover:text-[#b24a20]" title={user.fullName || user.email}>
                {user.fullName || user.email}
              </Link>
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
