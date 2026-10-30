import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { sign, verify } from "hono/jwt";
import type { Env, User } from "../types.js";

export const SESSION_COOKIE_NAME = "session";
const SESSION_TTL_SECONDS = 60 * 60;

export function createSessionToken(user: User, secret: string): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  return sign({ email: user.email, name: user.name, exp: expiresAt }, secret, "HS256");
}

async function readSessionUser(c: Context<Env>): Promise<User | null> {
  const token = getCookie(c, SESSION_COOKIE_NAME);
  if (!token) return null;
  try {
    const { email, name } = await verify(token, c.env.SESSION_SECRET, "HS256");
    return typeof email === "string" && typeof name === "string" ? { email, name } : null;
  } catch {
    return null;
  }
}

export async function startSession(c: Context<Env>, user: User): Promise<void> {
  setCookie(c, SESSION_COOKIE_NAME, await createSessionToken(user, c.env.SESSION_SECRET), {
    httpOnly: true,
    secure: c.env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
  });
}

export function endSession(c: Context<Env>): void {
  deleteCookie(c, SESSION_COOKIE_NAME, { path: "/" });
}

export const sessionMiddleware = createMiddleware<Env>(async (c, next) => {
  if (!c.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required");
  }

  const user = await readSessionUser(c);
  if (user) {
    c.set("user", user);
  }

  await next();

  if (user && !c.res.headers.has("Set-Cookie")) {
    await startSession(c, user);
  }
});
