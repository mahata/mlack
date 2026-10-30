import { Hono } from "hono";
import { csrf } from "hono/csrf";
import type { MiddlewareHandler } from "hono/types";
import { CookieStore, sessionMiddleware } from "hono-sessions";
import { requireSiteAdmin } from "./auth/requireSiteAdmin.js";
import { requireUser } from "./auth/requireUser.js";
import { authRoute } from "./routes/auth.js";
import { channelsRoute } from "./routes/channels.js";
import { directMessagesRoute } from "./routes/directMessages.js";
import { emailAuthRoute } from "./routes/emailAuth.js";
import { healthRoute } from "./routes/health.js";
import { indexRoute } from "./routes/index.js";
import { messagesRoute } from "./routes/messages.js";
import { siteAdminRoute } from "./routes/siteAdmin.js";
import { testAuthRoute } from "./routes/testAuth.js";
import { uploadsRoute } from "./routes/uploads.js";
import { wsRoute } from "./routes/ws.js";
import type { Env } from "./types.js";

type AppOptions = {
  sessionMiddleware?: MiddlewareHandler<Env>;
};

function createLazySessionMiddleware(): MiddlewareHandler<Env> {
  let cached: MiddlewareHandler | null = null;
  return async (c, next) => {
    if (!cached) {
      const store = new CookieStore();
      if (!c.env.SESSION_SECRET) {
        throw new Error("SESSION_SECRET environment variable is required");
      }
      cached = sessionMiddleware({
        store,
        encryptionKey: c.env.SESSION_SECRET,
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
  const app = new Hono<Env>();

  if (options?.sessionMiddleware) {
    app.use("*", options.sessionMiddleware);
  } else {
    app.use("*", createLazySessionMiddleware());
  }

  app.use("*", csrf());

  app.route("/", healthRoute);
  app.route("/", authRoute);
  app.route("/", emailAuthRoute);
  app.route("/", testAuthRoute);

  app.use("/site-admin/*", requireSiteAdmin);
  app.use("/site-admin", requireSiteAdmin);
  app.route("/", siteAdminRoute);

  app.use("/api/*", requireUser);

  app.route("/", channelsRoute);
  app.route("/", directMessagesRoute);
  app.route("/", messagesRoute);
  app.route("/", uploadsRoute);
  app.route("/", wsRoute);
  app.route("/", indexRoute);

  return { app };
}

const { app } = createApp();

export { app };
