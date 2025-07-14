import { googleAuth } from "@hono/oauth-providers/google";
import { Hono } from "hono";
import type { Session } from "hono-sessions";

type Variables = {
  session: Session;
};

const auth = new Hono<{ Variables: Variables }>();

// Google OAuth設定
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI;

if (!clientId || !clientSecret || !redirectUri) {
  throw new Error("Google OAuth環境変数が設定されていません");
}

// Google OAuth ルートを設定
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

    // セッションにユーザー情報を保存
    const session = c.get("session");
    const userInfo = {
      email: user.email,
      name: user.name,
      picture: user.picture,
    };

    console.log("Saving user to session:", userInfo);
    session.set("user", userInfo);

    // セッションが正しく保存されているか確認
    const savedUser = session.get("user");
    console.log("Verified saved user:", savedUser);

    return c.redirect("/");
  },
);

// ログアウト
auth.post("/auth/logout", async (c) => {
  const session = c.get("session");
  session.deleteSession();
  return c.redirect("/");
});

export { auth };
