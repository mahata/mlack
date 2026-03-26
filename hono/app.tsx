import { Hono } from "hono";
import { upgradeWebSocket } from "hono/cloudflare-workers";
import { csrf } from "hono/csrf";
import type { MiddlewareHandler } from "hono/types";
import type { WSContext } from "hono/ws";
import { CookieStore, sessionMiddleware } from "hono-sessions";
import { auth } from "./routes/auth.js";
import { channelsRoute } from "./routes/channels.js";
import { emailAuth } from "./routes/emailAuth.js";
import { health } from "./routes/health.js";
import { index } from "./routes/index.js";
import { messagesRoute } from "./routes/messages.js";
import { testAuth } from "./routes/testAuth.js";
import { createWsRoute } from "./routes/ws.js";
import type { Bindings, Variables } from "./types.js";

type AppOptions = {
  sessionMiddleware?: MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }>;
};

function createLazySessionMiddleware(): MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> {
  let cached: MiddlewareHandler | null = null;
  return async (c, next) => {
    if (!cached) {
      const store = new CookieStore();
      cached = sessionMiddleware({
        store,
        encryptionKey: c.env.SESSION_SECRET || "your-super-secret-key-change-in-production",
        expireAfterSeconds: 3600,
        cookieOptions: {
          httpOnly: true,
          secure: c.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
        },
      });
    }
    const mw = cached as MiddlewareHandler;
    return mw(c, next);
  };
}

export function createApp(options?: AppOptions) {
  const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

  if (options?.sessionMiddleware) {
    app.use("*", options.sessionMiddleware);
  } else {
    app.use("*", createLazySessionMiddleware());
  }

  const clients = new Map<WSContext, { userEmail: string }>();

  app.use("*", csrf());

  app.route("/", health);
  app.route("/", auth);
  app.route("/", emailAuth);
  app.route("/", channelsRoute);
  app.route("/", messagesRoute);
  app.route("/", index);
  app.route("/", createWsRoute(upgradeWebSocket, clients));
  app.route("/", testAuth);

  return { app };
}

const { app } = createApp();

export { app };
