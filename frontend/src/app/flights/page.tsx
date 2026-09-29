import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { FlightsClient } from "@/components/flights-client";
import { fetchCurrentUser } from "@/lib/backend";

export const metadata = {
  title: "Flights | Shelter",
};

export default async function FlightsPage() {
  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get("cookie") ?? "";
  const user = await fetchCurrentUser(cookieHeader);

  if (!user) redirect("/login?next=/flights");

  return (
    <main className="flex min-h-dvh w-full flex-col items-center gap-6 p-6">
      <AppHeader user={user} />
      <FlightsClient />
    </main>
  );
}
