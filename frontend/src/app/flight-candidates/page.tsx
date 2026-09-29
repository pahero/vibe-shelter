import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { FlightCandidatesClient } from "@/components/flight-candidates-client";
import { fetchCurrentUser } from "@/lib/backend";

export const metadata = {
  title: "Flight candidates | Shelter",
};

export default async function FlightCandidatesPage() {
  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get("cookie") ?? "";
  const user = await fetchCurrentUser(cookieHeader);

  if (!user) {
    redirect("/login?next=/flight-candidates");
  }

  return (
    <main className="flex min-h-dvh w-full flex-col items-center gap-6 p-6">
      <AppHeader user={user} />
      <FlightCandidatesClient />
    </main>
  );
}
