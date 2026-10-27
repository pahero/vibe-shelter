import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { MyTreatmentsClient } from "@/components/my-treatments-client";
import { fetchCurrentUser } from "@/lib/backend";

export default async function MyTreatmentsPage() {
  const requestHeaders = await headers();
  const user = await fetchCurrentUser(requestHeaders.get("cookie") ?? "");
  if (!user) redirect("/login?next=/my-treatments");
  return <MyTreatmentsClient />;
}
