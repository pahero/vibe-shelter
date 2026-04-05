export const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: "admin" | "staff";
};

export async function fetchCurrentUser(cookieHeader: string): Promise<AuthUser | null> {
  const response = await fetch(`${BACKEND_URL}/auth/me`, {
    method: "GET",
    headers: {
      cookie: cookieHeader,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as AuthUser;
}
