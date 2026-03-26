import { googleAuth } from "@hono/oauth-providers/google";
import { Hono } from "hono";
import type { Variables } from "../types.js";

const auth = new Hono<{ Variables: Variables }>();

// Google OAuth Settings
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI;

if (
  process.env.NODE_ENV !== "test" &&
  process.env.NODE_ENV !== "development" &&
  (!clientId || !clientSecret || !redirectUri)
) {
  throw new Error("Google OAuth Environmental Variables are not set");
}

// Google OAuth route setup
auth.get(
  "/auth/google",
  googleAuth({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    scope: ["openid", "email", "profile"],
  }),
  async (c) => {
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
  },
);

if (process.env.NODE_ENV === "development") {
  auth.get("/debug/session", async (c) => {
    const session = c.get("session");
    const user = session.get("user");
    return c.json({
      user,
      hasSession: !!session,
    });
  });
}

// Logout
auth.post("/auth/logout", async (c) => {
  const session = c.get("session");
  session.deleteSession();
  return c.redirect("/");
});

export { auth };
