import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fetchCurrentUser } from "@/lib/backend";
import { LocationsPageClient } from "@/components/locations-page-client";
import { LogoutButton } from "@/components/logout-button";

export const metadata = {
  title: "Locations | Shelter",
};

export default async function LocationsPage() {
  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get("cookie") ?? "";
  const user = await fetchCurrentUser(cookieHeader);

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-dvh bg-gradient-to-br from-[#f5ece1] to-[#fff8ee] p-6">
      <div className="mx-auto max-w-6xl">
        {/* Top Navigation */}
        <div className="mb-8 flex items-center justify-between border-b border-[#d4c7b4] pb-6">
          <Link href="/" className="text-2xl font-semibold text-[#d05a2c]">
            Shelter
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Welcome, <strong>{user.fullName || user.email}</strong>
            </span>
            <LogoutButton />
          </div>
        </div>

        {/* Content */}
        <LocationsPageClient />
      </div>
    </main>
  );
}
