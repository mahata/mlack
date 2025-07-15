import { Hono } from "hono";
import type { Session } from "hono-sessions";

type Variables = {
  session: Session;
};

const auth = new Hono<{ Variables: Variables }>();

// Google OAuth Settings
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI;

if (process.env.NODE_ENV !== "test" && (!clientId || !clientSecret || !redirectUri)) {
  throw new Error("Env vars for Google OAuth are not set");
}

// Start Google OAuth flow
auth.get("/auth/google", async (c) => {
  console.log("Starting Google OAuth flow");

  const state = Math.random().toString(36).substring(2, 15);
  const session = c.get("session");
  session.set("oauth_state", state);

  const params = new URLSearchParams({
    client_id: clientId || "",
    redirect_uri: redirectUri || "",
    response_type: "code",
    scope: "openid email profile",
    state: state,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  console.log("Redirecting to:", authUrl);

  return c.redirect(authUrl);
});

// Google OAuth callback
auth.get("/auth/google/callback", async (c) => {
  console.log("Google OAuth callback received");

  const code = c.req.query("code");
  const state = c.req.query("state");

  console.log("Received code:", code ? "exists" : "missing");
  console.log("Received state:", state);

  if (!code) {
    console.log("No authorization code received");
    return c.redirect("/?error=no_code");
  }

  const session = c.get("session");
  const savedState = session.get("oauth_state");

  console.log("Saved state:", savedState);

  if (state !== savedState) {
    console.log("State mismatch");
    return c.redirect("/?error=state_mismatch");
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId || "",
        client_secret: clientSecret || "",
        code: code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri || "",
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log("Token response:", tokenData);

    if (!tokenResponse.ok) {
      console.log("Token request failed:", tokenData);
      return c.redirect("/?error=token_failed");
    }

    // Fetch user info
    const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();
    console.log("User data:", userData);

    if (!userResponse.ok) {
      console.log("User info request failed:", userData);
      return c.redirect("/?error=user_failed");
    }

    // Save user info to session
    const userInfo = {
      email: userData.email,
      name: userData.name,
      picture: userData.picture,
    };

    console.log("Saving user to session:", userInfo);
    session.set("user", userInfo);
    session.set("oauth_state", null); // Clear state

    // Verify that the session is saved correctly
    const savedUser = session.get("user");
    console.log("Verified saved user:", savedUser);

    return c.redirect("/");
  } catch (error) {
    console.error("OAuth callback error:", error);
    return c.redirect("/?error=callback_error");
  }
});

// Debugging route
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
