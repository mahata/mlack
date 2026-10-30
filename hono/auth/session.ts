import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { sign, verify } from "hono/jwt";
import type { Env, User } from "../types.js";

export const SESSION_COOKIE_NAME = "session";
const SESSION_TTL_SECONDS = 60 * 60;
const SESSION_REFRESH_INTERVAL_SECONDS = 10 * 60;

type Session = {
  user: User;
  expiresAt: number;
};

function nowInSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function createSessionToken(user: User, secret: string): Promise<string> {
  return sign({ email: user.email, name: user.name, exp: nowInSeconds() + SESSION_TTL_SECONDS }, secret, "HS256");
}

async function readSession(c: Context<Env>): Promise<Session | null> {
  const token = getCookie(c, SESSION_COOKIE_NAME);
  if (!token) return null;
  try {
    const { email, name, exp } = await verify(token, c.env.SESSION_SECRET, "HS256");
    if (typeof email !== "string" || typeof name !== "string" || typeof exp !== "number") return null;
    return { user: { email, name }, expiresAt: exp };
  } catch {
    return null;
  }
}

function isDueForRefresh(session: Session): boolean {
  return session.expiresAt - nowInSeconds() < SESSION_TTL_SECONDS - SESSION_REFRESH_INTERVAL_SECONDS;
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

  const session = await readSession(c);
  if (session) {
    c.set("user", session.user);
  }

  await next();

  if (session && isDueForRefresh(session) && !c.res.headers.has("Set-Cookie")) {
    await startSession(c, session.user);
  }
});
