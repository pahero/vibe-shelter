"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { NotificationCenter } from "@/components/notification-center";
import type { AuthUser } from "@/lib/backend";

type HomeFooterProps = { user: AuthUser | null };

function UserIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="8" r="3.5" /><path strokeLinecap="round" d="M4.5 20a7.5 7.5 0 0 1 15 0" /></svg>;
}

function MenuIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" /></svg>;
}

export function HomeHeader({ user }: HomeFooterProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMenuOpen]);

  const menuLinks = [
    { href: "/flights", label: "Flights" },
    ...(user?.role === "admin" ? [{ href: "/shelter-management", label: "Shelter management" }] : []),
  ];
  const iconButtonClass = "inline-flex h-9 w-9 items-center justify-center rounded-full text-[#4d514b] transition hover:bg-[#efe7da] hover:text-[#b24a20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d05a2c]";

  return (
    <header className="relative z-50 flex w-full max-w-6xl items-center justify-between border-b border-[#d4c7b4] px-1 py-1">
      <span className="text-xl font-semibold tracking-[-0.04em] text-[#d05a2c]">Friends of Larnaca Cats</span>
      <div className="flex items-center gap-1">
        {user && <NotificationCenter iconOnly />}
        <Link href={user ? "/my-user" : "/login"} className={iconButtonClass} aria-label={user ? "User profile" : "Sign in"} title={user ? "User profile" : "Sign in"}><UserIcon /></Link>
        <div className="relative" ref={menuRef}>
          <button type="button" className={iconButtonClass} aria-label="Open menu" title="Open menu" aria-haspopup="menu" aria-expanded={isMenuOpen} onClick={() => setIsMenuOpen((open) => !open)}><MenuIcon /></button>
          {isMenuOpen && <nav role="menu" aria-label="Main menu" className="absolute right-0 top-full mt-3 w-56 overflow-hidden rounded-2xl border border-[#d4c7b4] bg-[#fff8ee] p-1.5 shadow-xl">
            {menuLinks.map(({ href, label }) => <Link key={href} role="menuitem" href={href} onClick={() => setIsMenuOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-semibold text-[#1f2320] transition hover:bg-[#efe7da]">{label}</Link>)}
          </nav>}
        </div>
      </div>
    </header>
  );
}
