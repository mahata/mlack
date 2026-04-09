import type { Session } from "hono-sessions";

export type User = {
  email: string;
  name: string;
  picture?: string;
};

export type Workspace = {
  id: number;
  name: string;
  slug: string;
  createdByEmail: string;
  createdAt: string | null;
};

export type WorkspaceMember = {
  id: number;
  workspaceId: number;
  userEmail: string;
  role: "admin" | "member";
  joinedAt: string | null;
};

export type Channel = {
  id: number;
  name: string;
  workspaceId: number;
  createdByEmail: string;
  createdAt: string | null;
};

export type Bindings = {
  DB: D1Database;
  STORAGE: R2Bucket;
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
  workspace?: Workspace;
  workspaceMember?: WorkspaceMember;
};

export type Env = {
  Bindings: Bindings;
  Variables: Variables;
};
