import type { Session } from "hono-sessions";

export type User = {
  email?: string;
  name?: string;
  picture?: string;
};

export type Variables = {
  session: Session;
};
