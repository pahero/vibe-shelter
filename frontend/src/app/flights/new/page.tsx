import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { FlightCreateClient } from "@/components/flight-create-client";
import { fetchCurrentUser } from "@/lib/backend";

export const metadata = { title: "Add flight | Shelter" };

export default async function NewFlightPage() {
  const cookieHeader = (await headers()).get("cookie") ?? "";
  const user = await fetchCurrentUser(cookieHeader);
  if (!user) redirect("/login?next=/flights/new");
  return <main className="flex min-h-dvh w-full flex-col items-center p-6"><FlightCreateClient /></main>;
}
