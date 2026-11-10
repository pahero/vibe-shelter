"use client";

import Link from "next/link";
import { useState } from "react";
import { ContextMenu } from "@/components/context-menu";
import { NotificationCenter } from "@/components/notification-center";
import { LogoutButton } from "@/components/logout-button";
import type { AuthUser } from "@/lib/backend";

type HomeFooterProps = { user: AuthUser | null };

function UserIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path strokeLinecap="round" d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function HomeHeader({ user }: HomeFooterProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuLinks = [
    ...(user?.role === "admin" || user?.role === "owner"
      ? [{ href: "/shelter-management", label: "Shelter management" }]
      : []),
    { href: "/flights", label: "Flights" },
  ];
  const iconButtonClass =
    "inline-flex h-9 w-9 items-center justify-center rounded-full text-[#4d514b] transition hover:bg-[#efe7da] hover:text-[#b24a20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d05a2c]";

  return (
    <header className="relative z-50 flex w-full max-w-6xl items-center justify-between border-b border-[#d4c7b4] px-1 py-1">
      <span className="text-xl font-semibold tracking-[-0.04em] text-[#d05a2c]">
        Friends of Larnaca Cats
      </span>
      <div className="flex items-center gap-1">
        {user && <NotificationCenter iconOnly />}
        <div className="flex items-center gap-1">
          {user ? (
            <ContextMenu
              open={isUserMenuOpen}
              onOpenChange={setIsUserMenuOpen}
              menuLabel="User menu"
              className="absolute right-0 top-full mt-3 w-48 overflow-hidden rounded-2xl border border-[#d4c7b4] bg-[#fff8ee] p-1.5 shadow-xl"
              trigger={
                <button
                  type="button"
                  className={iconButtonClass}
                  aria-label="User menu"
                  title="User menu"
                  aria-haspopup="menu"
                  aria-expanded={isUserMenuOpen}
                  onClick={() => {
                    setIsUserMenuOpen((open) => !open);
                    setIsMenuOpen(false);
                  }}
                >
                  <UserIcon />
                </button>
              }
            >
              <Link
                role="menuitem"
                href="/my-user"
                onClick={() => setIsUserMenuOpen(false)}
                className="block rounded-xl px-4 py-3 text-sm font-semibold text-[#1f2320] transition hover:bg-[#efe7da]"
              >
                Profile
              </Link>
              <Link
                role="menuitem"
                href="/my-treatments"
                onClick={() => setIsUserMenuOpen(false)}
                className="block rounded-xl px-4 py-3 text-sm font-semibold text-[#1f2320] transition hover:bg-[#efe7da]"
              >
                My treatments
              </Link>
              <Link
                role="menuitem"
                href="/my-reminders"
                onClick={() => setIsUserMenuOpen(false)}
                className="block rounded-xl px-4 py-3 text-sm font-semibold text-[#1f2320] transition hover:bg-[#efe7da]"
              >
                My reminders
              </Link>
              <LogoutButton className="block w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#1f2320] transition hover:bg-[#efe7da]" />
            </ContextMenu>
          ) : (
            <Link
              href="/login"
              className={iconButtonClass}
              aria-label="Sign in"
              title="Sign in"
            >
              <UserIcon />
            </Link>
          )}
          <ContextMenu
            open={isMenuOpen}
            onOpenChange={setIsMenuOpen}
            menuLabel="Main menu"
            className="absolute right-0 top-full mt-3 w-56 overflow-hidden rounded-2xl border border-[#d4c7b4] bg-[#fff8ee] p-1.5 shadow-xl"
            trigger={
              <button
                type="button"
                className={iconButtonClass}
                aria-label="Open menu"
                title="Open menu"
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                onClick={() => {
                  setIsMenuOpen((open) => !open);
                  setIsUserMenuOpen(false);
                }}
              >
                <MenuIcon />
              </button>
            }
          >
            {menuLinks.map(({ href, label }) => (
              <Link
                key={href}
                role="menuitem"
                href={href}
                onClick={() => setIsMenuOpen(false)}
                className="block rounded-xl px-4 py-3 text-sm font-semibold text-[#1f2320] transition hover:bg-[#efe7da]"
              >
                {label}
              </Link>
            ))}
          </ContextMenu>
        </div>
      </div>
    </header>
  );
}
