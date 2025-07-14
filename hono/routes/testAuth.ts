import { Hono } from "hono";
import type { Session } from "hono-sessions";

type Variables = {
  session: Session;
};

const testAuth = new Hono<{ Variables: Variables }>();

// E2Eテスト用のモックログイン
testAuth.post("/test/login", async (c) => {
  if (process.env.NODE_ENV !== "development") {
    return c.json({ error: "Test login only available in development" }, 403);
  }

  const session = c.get("session");
  
  // E2E用のテストユーザー情報
  const testUser = {
    email: process.env.E2E_GMAIL_ACCOUNT || "test@example.com",
    name: "Test User",
    picture: "https://via.placeholder.com/32",
  };

  console.log("Test login - saving user to session:", testUser);
  session.set("user", testUser);
  
  return c.json({ success: true, user: testUser });
});

// E2Eテスト用のログアウト
testAuth.post("/test/logout", async (c) => {
  if (process.env.NODE_ENV !== "development") {
    return c.json({ error: "Test logout only available in development" }, 403);
  }

  const session = c.get("session");
  session.deleteSession();
  
  return c.json({ success: true });
});

export { testAuth };
