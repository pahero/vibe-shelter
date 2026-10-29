import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { EditShelterClient } from "@/components/edit-shelter-client";
import { fetchCurrentUser } from "@/lib/backend";

export const metadata = {
  title: "Shelter management | Shelter",
};

export default async function EditShelterPage() {
  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get("cookie") ?? "";
  const user = await fetchCurrentUser(cookieHeader);

  if (!user) {
    redirect("/login?next=/shelter-management");
  }

  if (user.role !== "admin" && user.role !== "owner") {
    redirect("/");
  }

  return (
    <main className="min-h-dvh w-full bg-gradient-to-br from-[#f5ece1] to-[#fff8ee] p-6 pb-32">
      <EditShelterClient currentUser={{ id: user.id, role: user.role }} />
    </main>
  );
}
