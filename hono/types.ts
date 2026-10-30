export type User = {
  email: string;
  name: string;
};

export type Bindings = {
  DB: D1Database;
  STORAGE: R2Bucket;
  CHAT_ROOM: DurableObjectNamespace;
  SESSION_SECRET: string;
  NODE_ENV: string;
  RESEND_API_KEY: string;
  RESEND_FROM_EMAIL: string;
  SITE_ADMIN_EMAIL: string;
};

export type Variables = {
  user: User;
};

export type Env = {
  Bindings: Bindings;
  Variables: Variables;
};
