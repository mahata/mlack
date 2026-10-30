import { Hono } from "hono";
import { endSession, startSession } from "../auth/session.js";
import type { Env, User } from "../types.js";

const TEST_USER: User = {
  email: "test@example.com",
  name: "Test User",
};

const testAuthRoute = new Hono<Env>();

testAuthRoute.post("/test/login", async (c) => {
  if (c.env.NODE_ENV !== "development") {
    return c.json({ error: "Test login only available in development" }, 403);
  }

  await startSession(c, TEST_USER);
  return c.json({ success: true, user: TEST_USER });
});

testAuthRoute.post("/test/logout", (c) => {
  if (c.env.NODE_ENV !== "development") {
    return c.json({ error: "Test logout only available in development" }, 403);
  }

  endSession(c);
  return c.json({ success: true });
});

export { testAuthRoute };
