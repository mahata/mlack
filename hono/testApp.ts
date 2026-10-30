import { app } from "./app.js";
import { createSessionToken, SESSION_COOKIE_NAME } from "./auth/session.js";
import type { Bindings, User } from "./types.js";

const TEST_SESSION_SECRET = "test-session-secret";

export function createTestEnv(overrides: Partial<Bindings> = {}): Bindings {
  return {
    DB: {} as D1Database,
    STORAGE: {} as R2Bucket,
    CHAT_ROOM: {} as DurableObjectNamespace,
    SESSION_SECRET: TEST_SESSION_SECRET,
    NODE_ENV: "test",
    RESEND_API_KEY: "re_test_key",
    RESEND_FROM_EMAIL: "noreply@test.com",
    SITE_ADMIN_EMAIL: "",
    ...overrides,
  };
}

export async function createSessionCookie(user: User): Promise<string> {
  return `${SESSION_COOKIE_NAME}=${await createSessionToken(user, TEST_SESSION_SECRET)}`;
}

export function createTestApp(options?: { authenticatedUser?: User | null; storageMock?: R2Bucket }) {
  const env = createTestEnv(options?.storageMock ? { STORAGE: options.storageMock } : {});

  async function request(input: string | Request, init?: RequestInit) {
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init?.headers).forEach((value, key) => {
      headers.set(key, value);
    });
    if (options?.authenticatedUser) {
      headers.set("Cookie", await createSessionCookie(options.authenticatedUser));
    }
    return app.request(input, { ...init, headers }, env);
  }

  return { app: { request } };
}
