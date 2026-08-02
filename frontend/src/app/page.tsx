import { headers } from "next/headers";
import { AppHeader } from "@/components/app-header";
import { HomeCatsList } from "@/components/home-cats-list";
import { fetchCurrentUser } from "@/lib/backend";

export default async function Home() {
  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get("cookie") ?? "";
  const user = await fetchCurrentUser(cookieHeader);

  return (
    <main className="flex min-h-dvh w-full flex-col items-center gap-6 p-6">
      <AppHeader user={user} />
      <HomeCatsList />
    </main>
  );
}
