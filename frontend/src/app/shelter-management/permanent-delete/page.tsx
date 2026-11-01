import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { PermanentCatDeletionClient } from "@/components/permanent-cat-deletion-client";
import { fetchCurrentUser } from "@/lib/backend";

export const metadata = { title: "Permanently delete cats | Shelter" };

export default async function PermanentCatDeletionPage() {
  const cookieHeader = (await headers()).get("cookie") ?? "";
  const user = await fetchCurrentUser(cookieHeader);
  if (!user) redirect("/login?next=/shelter-management/permanent-delete");
  if (user.role !== "owner") redirect("/shelter-management");
  return <main className="flex min-h-dvh w-full flex-col items-center gap-6 bg-gradient-to-br from-[#f5ece1] to-[#fff8ee] p-6 pb-32"><AppHeader user={user} /><PermanentCatDeletionClient /></main>;
}
