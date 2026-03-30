import type { Session } from "hono-sessions";

export type User = {
  email: string;
  name: string;
  picture?: string;
};

export type Channel = {
  id: number;
  name: string;
  createdByEmail: string;
  createdAt: string | null;
};

export type Bindings = {
  DB: D1Database;
  CHAT_ROOM: DurableObjectNamespace;
  SESSION_SECRET: string;
  NODE_ENV: string;
  GOOGLE_ID: string;
  GOOGLE_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  E2E_GMAIL_ACCOUNT: string;
  RESEND_API_KEY: string;
  RESEND_FROM_EMAIL: string;
};

export type Variables = {
  session: Session;
  user: User;
};

export type Env = {
  Bindings: Bindings;
  Variables: Variables;
};
