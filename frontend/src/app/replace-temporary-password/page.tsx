import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ReplaceTemporaryPasswordClient } from "@/components/replace-temporary-password-client";
import { fetchCurrentUser } from "@/lib/backend";

export const metadata = {
  title: "Create a permanent password | Shelter",
};

export default async function ReplaceTemporaryPasswordPage() {
  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get("cookie") ?? "";
  const user = await fetchCurrentUser(cookieHeader);

  if (!user) {
    redirect("/login?next=/replace-temporary-password");
  }

  if (!user.passwordChangeRequired) {
    redirect("/");
  }

  return (
    <main className="flex min-h-dvh w-full items-center justify-center p-6">
      <ReplaceTemporaryPasswordClient />
    </main>
  );
}
