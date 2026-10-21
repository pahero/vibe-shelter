import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { FlightsClient } from "@/components/flights-client";
import { fetchCurrentUser } from "@/lib/backend";

export const metadata = { title: "Flight details | Shelter" };

export default async function FlightDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, requestHeaders] = await Promise.all([params, headers()]);
  const cookieHeader = requestHeaders.get("cookie") ?? "";
  const user = await fetchCurrentUser(cookieHeader);
  if (!user) redirect(`/login?next=/flights/${id}`);
  return <main className="flex min-h-dvh w-full flex-col items-center p-6"><FlightsClient standaloneFlightId={id} /></main>;
}
