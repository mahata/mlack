import { googleAuth } from "@hono/oauth-providers/google";
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db, users } from "../db/index.js";
import type { Variables } from "../types.js";

const auth = new Hono<{ Variables: Variables }>();

// Google OAuth Settings
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI;

if (process.env.NODE_ENV !== "test" && process.env.NODE_ENV !== "development" && (!clientId || !clientSecret || !redirectUri)) {
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
    console.log("OAuth callback received");

    const token = c.get("token");
    const user = c.get("user-google");

    console.log("Token:", token ? "exists" : "missing");
    console.log("User:", user);

    if (!token || !user) {
      console.log("Authentication failed - missing token or user");
      return c.redirect("/?error=auth_failed");
    }

    try {
      // Ensure we have the required user email
      if (!user.email) {
        console.log("Authentication failed - missing user email");
        return c.redirect("/?error=missing_email");
      }

      // Find or create user in database
      let dbUser = await db
        .select()
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1);

      if (dbUser.length === 0) {
        // Create new user
        const newUser = await db
          .insert(users)
          .values({
            email: user.email,
            name: user.name || null,
          })
          .returning();
        dbUser = newUser;
      }

      // Save user info to session (including database user ID)
      const session = c.get("session");
      const userInfo = {
        id: dbUser[0].id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      };

      console.log("Saving user to session:", userInfo);
      session.set("user", userInfo);

      // Check if session is saved correctly
      const savedUser = session.get("user");
      console.log("Verified saved user:", savedUser);

      return c.redirect("/");
    } catch (error) {
      console.error("OAuth callback error:", error);
      return c.redirect("/?error=callback_error");
    }
  },
);

// Debug endpoint
auth.get("/debug/session", async (c) => {
  const session = c.get("session");
  const user = session.get("user");
  return c.json({
    user,
    hasSession: !!session,
  });
});

// Logout
auth.post("/auth/logout", async (c) => {
  const session = c.get("session");
  session.deleteSession();
  return c.redirect("/");
});

export { auth };
