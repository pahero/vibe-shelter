import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { EditShelterClient } from "@/components/edit-shelter-client";
import { fetchCurrentUser } from "@/lib/backend";

export const metadata = {
  title: "Edit shelter | Shelter",
};

export default async function EditShelterPage() {
  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get("cookie") ?? "";
  const user = await fetchCurrentUser(cookieHeader);

  if (!user) {
    redirect("/login?next=/edit-shelter");
  }

  if (user.role !== "admin") {
    redirect("/");
  }

  return (
    <main className="flex min-h-dvh w-full flex-col items-center gap-6 p-6">
      <AppHeader user={user} />
      <EditShelterClient />
    </main>
  );
}
