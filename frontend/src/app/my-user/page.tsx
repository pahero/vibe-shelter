import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { MyUserClient } from "@/components/my-user-client";
import { fetchCurrentUser } from "@/lib/backend";

export const metadata = {
  title: "My user | Shelter",
};

export default async function MyUserPage() {
  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get("cookie") ?? "";
  const user = await fetchCurrentUser(cookieHeader);

  if (!user) {
    redirect("/login?next=/my-user");
  }

  if (user.passwordChangeRequired) {
    redirect("/replace-temporary-password");
  }

  return (
    <main className="flex min-h-dvh w-full flex-col items-center gap-6 p-6">
      <AppHeader user={user} />
      <MyUserClient user={user} />
    </main>
  );
}
