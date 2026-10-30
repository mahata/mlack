import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { app } from "./app.js";
import { createSessionToken, SESSION_COOKIE_NAME } from "./auth/session.js";
import type { Bindings, User } from "./types.js";

const TEST_SESSION_SECRET = "test-session-secret";
const DB_DIRECTORY = new URL("./db/", import.meta.url);

export function createTestDb(): D1Database {
  const sqlite = new DatabaseSync(":memory:");
  const migrations = readdirSync(new URL("migrations/", DB_DIRECTORY))
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => `migrations/${file}`);
  for (const file of [...migrations, "seed.sql"]) {
    sqlite.exec(readFileSync(new URL(file, DB_DIRECTORY), "utf8"));
  }

  function prepare(query: string) {
    const statement = sqlite.prepare(query);
    let params: SQLInputValue[] = [];
    const preparedStatement = {
      bind(...values: SQLInputValue[]) {
        params = values;
        return preparedStatement;
      },
      first: async () => statement.get(...params) ?? null,
      all: async () => ({ results: statement.all(...params) }),
      run: async () => ({ meta: { changes: Number(statement.run(...params).changes) } }),
    };
    return preparedStatement;
  }

  return { prepare, exec: async (query: string) => sqlite.exec(query) } as unknown as D1Database;
}

export function createTestEnv(overrides: Partial<Bindings> = {}): Bindings {
  return {
    DB: createTestDb(),
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

export function createTestApp(options: { authenticatedUser?: User | null; env?: Partial<Bindings> } = {}) {
  const env = createTestEnv(options.env);

  async function request(input: string | Request, init?: RequestInit) {
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init?.headers).forEach((value, key) => {
      headers.set(key, value);
    });
    if (options.authenticatedUser) {
      headers.set("Cookie", await createSessionCookie(options.authenticatedUser));
    }
    return app.request(input, { ...init, headers }, env);
  }

  return { app: { request }, db: env.DB, env };
}
