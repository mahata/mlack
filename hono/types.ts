import type { Session } from "hono-sessions";

export type User = {
  email?: string;
  name?: string;
  picture?: string;
};

export type Channel = {
  id: number;
  name: string;
  createdByEmail: string;
  createdAt: Date | null;
};

export type Variables = {
  session: Session;
};
