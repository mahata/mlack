import { describe, expect, it } from "vitest";
import { createTestApp } from "../testApp.js";

describe.each(["production", "staging"])("test authentication in %s", (nodeEnv) => {
  it.each(["login", "logout"])("rejects test %s", async (action) => {
    const { app } = createTestApp({ env: { NODE_ENV: nodeEnv } });

    const response = await app.request(`/test/${action}`, {
      method: "POST",
      headers: { Origin: "http://localhost", "Content-Type": "application/x-www-form-urlencoded" },
    });

    expect(response.status).toBe(403);
  });
});
