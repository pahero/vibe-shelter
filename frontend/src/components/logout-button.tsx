"use client";

import { useRouter } from "next/navigation";
import { BACKEND_URL } from "@/lib/backend";

export function LogoutButton() {
  const router = useRouter();

  async function onLogout() {
    await fetch(`${BACKEND_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });

    router.push("/login");
    router.refresh();
  }

  return (
    <button
      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#d4c7b4] px-4 text-sm font-semibold text-[#1f2320] transition hover:-translate-y-px hover:bg-black/5"
      onClick={onLogout}
      type="button"
    >
      Log out
    </button>
  );
}
