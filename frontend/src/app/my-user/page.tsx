import { headers } from "next/headers";
import { redirect } from "next/navigation";
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
    <main className="min-h-dvh w-full bg-gradient-to-br from-[#f5ece1] to-[#fff8ee] p-6 pb-32">
      <MyUserClient user={user} />
    </main>
  );
}
