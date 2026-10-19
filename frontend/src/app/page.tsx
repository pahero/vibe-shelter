import { headers } from "next/headers";
import { HomeHeader } from "@/components/home-header";
import { HomeCatsList } from "@/components/home-cats-list";
import { fetchCurrentUser } from "@/lib/backend";

export default async function Home() {
  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get("cookie") ?? "";
  const user = await fetchCurrentUser(cookieHeader);

  return (
    <div className="flex min-h-dvh w-full flex-col items-center px-4 pt-6 pb-4 sm:px-6">
      <HomeHeader user={user} />
      <main className="w-full flex-1 pt-6">
        <div className="mx-auto w-full max-w-6xl">
          <HomeCatsList />
        </div>
      </main>
    </div>
  );
}
