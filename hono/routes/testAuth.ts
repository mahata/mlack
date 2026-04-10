import { Hono } from "hono";
import type { Env } from "../types.js";

const testAuthRoute = new Hono<Env>();

testAuthRoute.post("/test/login", async (c) => {
  if (c.env.NODE_ENV !== "development") {
    return c.json({ error: "Test login only available in development" }, 403);
  }

  const session = c.get("session");

  const testUser = {
    email: c.env.E2E_GMAIL_ACCOUNT || "test@example.com",
    name: "Test User",
    picture: "",
  };

  console.log("Test login - saving user to session:", testUser);
  session.set("user", testUser);

  return c.json({ success: true, user: testUser });
});

testAuthRoute.post("/test/logout", async (c) => {
  if (c.env.NODE_ENV !== "development") {
    return c.json({ error: "Test logout only available in development" }, 403);
  }

  const session = c.get("session");
  session.deleteSession();

  return c.json({ success: true });
});

export { testAuthRoute };
