export const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: "admin" | "staff";
};

export type AdminUser = {
  id: string;
  email: string;
  fullName: string | null;
  status: "active" | "inactive";
  role: "admin" | "staff";
  isTest: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateAdminUserInput = {
  email: string;
  fullName?: string;
  role: "admin" | "staff";
  status: "active" | "inactive";
  password: string;
  isTest: boolean;
};

export async function fetchCurrentUser(cookieHeader: string): Promise<AuthUser | null> {
  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}/auth/me`, {
      method: "GET",
      headers: {
        cookie: cookieHeader,
      },
      cache: "no-store",
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as AuthUser;
}

export async function fetchAdminUsers(cookieHeader?: string): Promise<AdminUser[]> {
  const response = await fetch(`${BACKEND_URL}/admin/users`, {
    method: "GET",
    headers: cookieHeader
      ? {
          cookie: cookieHeader,
        }
      : undefined,
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load users");
  }

  return (await response.json()) as AdminUser[];
}

export async function createAdminUser(input: CreateAdminUserInput): Promise<AdminUser> {
  const response = await fetch(`${BACKEND_URL}/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message);
  }

  return (await response.json()) as AdminUser;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) {
      return body.message.join(" ");
    }
    if (body.message) {
      return body.message;
    }
  } catch {
    // Fall back to status text below when the backend does not return JSON.
  }

  return response.statusText || "User registration failed";
}
