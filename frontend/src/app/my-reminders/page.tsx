import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/dashboard-client";
import { fetchCurrentUser } from "@/lib/backend";

export default async function DashboardPage() {
  const requestHeaders = await headers();
  const user = await fetchCurrentUser(requestHeaders.get("cookie") ?? "");
  if (!user) redirect("/login?next=/my-reminders");
  return <DashboardClient />;
}
