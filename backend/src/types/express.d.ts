import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    sessionId?: string;
  }
}

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      fullName: string | null;
      role: 'ADMIN' | 'STAFF';
      status?: 'ACTIVE' | 'INACTIVE';
    }
  }
}

export {};
