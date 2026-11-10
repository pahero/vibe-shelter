"use client";

import Link from "next/link";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { CatTasks } from "@/components/cat-tasks";

export function DashboardClient() {
  return (
    <main className="relative min-h-dvh w-full animate-rise px-6 pt-6 text-[#1f2320]">
      <Link
        href="/"
        aria-label="Back to home"
        title="Back to home"
        className="fixed left-8 top-10 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-[#d4c7b4] bg-[#fff8ee]/90 text-[#d05a2c] shadow-md backdrop-blur-sm transition hover:bg-white hover:text-[#b24a20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d05a2c]"
      >
        <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" />
      </Link>
      <section className="mx-auto mt-5 w-full max-w-6xl">
        <h1 className="text-2xl font-semibold text-gray-900">My reminders</h1>
        <div className="mt-6">
          <CatTasks dashboard />
        </div>
      </section>
    </main>
  );
}
