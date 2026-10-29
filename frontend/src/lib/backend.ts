export const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

function getBackendUrl(): string {
  if (typeof window === "undefined") {
    return process.env.INTERNAL_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";
  }

  return BACKEND_URL;
}

export type AuthUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: "owner" | "admin" | "staff";
  passwordChangeRequired?: boolean;
};

export type AdminUser = {
  id: string;
  email: string;
  fullName: string | null;
  status: "active" | "inactive";
  role: "owner" | "admin" | "staff";
  isTest: boolean;
  passwordChangeRequired: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateAdminUserInput = {
  email: string;
  fullName?: string;
  role: "owner" | "admin" | "staff";
  status: "active" | "inactive";
  password: string;
  isTest: boolean;
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirmation: string;
};

export async function fetchCurrentUser(cookieHeader: string): Promise<AuthUser | null> {
  let response: Response;
  try {
    response = await fetch(`${getBackendUrl()}/auth/me`, {
      method: "GET",
      headers: { cookie: cookieHeader },
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
  const response = await fetch(`${getBackendUrl()}/admin/users`, {
    method: "GET",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load users");
  }

  return (await response.json()) as AdminUser[];
}

export async function createAdminUser(input: CreateAdminUserInput): Promise<AdminUser> {
  const response = await authenticatedFetch(`${getBackendUrl()}/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message);
  }
  const users = await fetchAdminUsers();
  const matchingUser = users.find((user) => user.email.toLowerCase() === input.email.toLowerCase());
  if (!matchingUser) throw new Error("The user was created but could not be loaded.");
  return matchingUser;
}

export async function setAdminUserTemporaryPassword(userId: string, password: string): Promise<void> {
  const response = await authenticatedFetch(`${getBackendUrl()}/admin/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
}

export async function setAdminUserTestStatus(userId: string, isTest: boolean): Promise<AdminUser> {
  const response = await authenticatedFetch(`${getBackendUrl()}/admin/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isTest }),
  });

  if (!response.ok) throw new Error(await readErrorMessage(response));
  return fetchAdminUser(userId);
}

export async function setAdminUserRole(userId: string, role: AdminUser["role"]): Promise<AdminUser> {
  const response = await authenticatedFetch(`${getBackendUrl()}/admin/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  if (!response.ok) throw new Error(await readErrorMessage(response));
  return fetchAdminUser(userId);
}

async function fetchAdminUser(userId: string): Promise<AdminUser> {
  const response = await authenticatedFetch(`${getBackendUrl()}/admin/users/${userId}`, { method: "GET" });
  if (!response.ok) throw new Error(await readErrorMessage(response));
  return (await response.json()) as AdminUser;
}

export async function changePassword(input: ChangePasswordInput): Promise<void> {
  const response = await authenticatedFetch(`${getBackendUrl()}/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
}

export async function replaceTemporaryPassword(input: Pick<ChangePasswordInput, "newPassword" | "newPasswordConfirmation">): Promise<void> {
  const response = await authenticatedFetch(`${getBackendUrl()}/auth/replace-temporary-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  // The access token still contains passwordChangeRequired=true. Rotate it
  // now so subsequent page requests see the updated account state.
  const refreshResponse = await authenticatedFetch(`${getBackendUrl()}/auth/token`, {
    method: "POST",
  });
  if (!refreshResponse.ok) {
    throw new Error("Password was changed, but the session could not be refreshed. Please sign in again.");
  }
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
export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const send = () => fetch(input, { ...init, credentials: "include" });
  const response = await send();
  if (response.status !== 401 || typeof window === "undefined") return response;

  const refreshResponse = await fetch(`${BACKEND_URL}/auth/token`, {
    method: "POST",
    credentials: "include",
  });
  if (!refreshResponse.ok) return response;
  return send();
}
