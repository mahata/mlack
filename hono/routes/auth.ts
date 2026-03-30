import { googleAuth } from "@hono/oauth-providers/google";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import type { Env } from "../types.js";

const auth = new Hono<Env>();

const googleOAuthMiddleware = createMiddleware<Env>(async (c, next) => {
  const handler = googleAuth({
    client_id: c.env.GOOGLE_ID,
    client_secret: c.env.GOOGLE_SECRET,
    redirect_uri: c.env.GOOGLE_REDIRECT_URI,
    scope: ["openid", "email", "profile"],
  });
  return handler(c, next);
});

auth.get("/auth/google", googleOAuthMiddleware, async (c) => {
  const token = c.get("token");
  const user = c.get("user-google");

  if (!token || !user) {
    return c.redirect("/?error=auth_failed");
  }

  try {
    const session = c.get("session");
    const userInfo = {
      email: user.email ?? "",
      name: user.name ?? "",
      picture: user.picture,
    };

    session.set("user", userInfo);

    return c.redirect("/");
  } catch (error) {
    console.error("OAuth callback error:", error);
    return c.redirect("/?error=callback_error");
  }
});

auth.get("/debug/session", async (c) => {
  if (c.env.NODE_ENV !== "development") {
    return c.json({ error: "Debug endpoint only available in development" }, 403);
  }
  const session = c.get("session");
  const user = session.get("user");
  return c.json({
    user,
    hasSession: !!session,
  });
});

auth.post("/auth/logout", async (c) => {
  const session = c.get("session");
  session.deleteSession();
  return c.redirect("/");
});

export { auth };
