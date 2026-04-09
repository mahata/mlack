import { Hono } from "hono";
import { csrf } from "hono/csrf";
import type { MiddlewareHandler } from "hono/types";
import { CookieStore, sessionMiddleware } from "hono-sessions";
import { requireWorkspaceMember } from "./auth/requireWorkspaceMember.js";
import { auth } from "./routes/auth.js";
import { channelsRoute } from "./routes/channels.js";
import { emailAuth } from "./routes/emailAuth.js";
import { health } from "./routes/health.js";
import { index } from "./routes/index.js";
import { messagesRoute } from "./routes/messages.js";
import { testAuth } from "./routes/testAuth.js";
import { uploadsRoute } from "./routes/uploads.js";
import { workspaceAdminRoute } from "./routes/workspaceAdmin.js";
import { workspaceInviteRoute } from "./routes/workspaceInvite.js";
import { workspacesRoute } from "./routes/workspaces.js";
import { createWsRoute } from "./routes/ws.js";
import type { Env } from "./types.js";

type AppOptions = {
  sessionMiddleware?: MiddlewareHandler<Env>;
};

function createLazySessionMiddleware(): MiddlewareHandler<Env> {
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
  const app = new Hono<Env>();

  if (options?.sessionMiddleware) {
    app.use("*", options.sessionMiddleware);
  } else {
    app.use("*", createLazySessionMiddleware());
  }

  app.use("*", csrf());

  app.route("/", health);
  app.route("/", auth);
  app.route("/", emailAuth);
  app.route("/", testAuth);

  app.route("/", workspacesRoute);
  app.route("/", workspaceInviteRoute);

  app.use("/w/:slug/api/*", requireWorkspaceMember);
  app.use("/w/:slug/ws", requireWorkspaceMember);
  app.use("/w/:slug", requireWorkspaceMember);

  app.route("/", channelsRoute);
  app.route("/", messagesRoute);
  app.route("/", uploadsRoute);
  app.route("/", createWsRoute());
  app.route("/", workspaceAdminRoute);
  app.route("/", index);

  return { app };
}

const { app } = createApp();

export { app };
