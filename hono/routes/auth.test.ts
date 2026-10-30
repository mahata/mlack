import { describe, expect, it } from "vitest";
import { createTestApp } from "../testApp.js";

describe("Auth routes", () => {
  it("should not serve Google login", async () => {
    const { app } = createTestApp({ authenticatedUser: null });

    const response = await app.request("/auth/google");

    expect(response.status).toBe(404);
  });

  it("should clear the session cookie and redirect to the root page on logout", async () => {
    const { app } = createTestApp({ authenticatedUser: { email: "test@example.com", name: "Test User" } });

    const response = await app.request("/auth/logout", { method: "POST", headers: { Origin: "http://localhost" } });

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/");
    const setCookies = response.headers.getSetCookie();
    expect(setCookies).toHaveLength(1);
    expect(setCookies[0]).toMatch(/^session=; Max-Age=0;/);
  });
});
