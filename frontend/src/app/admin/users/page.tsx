import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { UserRegistrationClient } from "@/components/user-registration-client";
import { fetchAdminUsers, fetchCurrentUser } from "@/lib/backend";

export const metadata = {
  title: "Register users | Shelter",
};

export default async function AdminUsersPage() {
  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get("cookie") ?? "";
  const user = await fetchCurrentUser(cookieHeader);

  if (!user) {
    redirect("/login?next=/admin/users");
  }

  if (user.role !== "admin") {
    redirect("/");
  }

  const users = await fetchAdminUsers(cookieHeader);

  return (
    <main className="flex min-h-dvh w-full flex-col items-center gap-6 p-6">
      <AppHeader user={user} />
      <UserRegistrationClient initialUsers={users} />
    </main>
  );
}
