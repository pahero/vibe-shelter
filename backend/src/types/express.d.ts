declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      fullName: string | null;
      role: "ADMIN" | "STAFF";
      isTest: boolean;
      passwordChangeRequired: boolean;
      status?: "ACTIVE" | "INACTIVE";
    }
  }
}

export {};
