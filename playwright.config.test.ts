import { afterEach, describe, expect, it, vi } from "vitest";

const MODULE_IMPORT_TIMEOUT_MS = 15000;

async function loadWebServerEnv() {
  vi.resetModules();
  const { default: playwrightConfig } = await import("./playwright.config.js");
  const webServer = Array.isArray(playwrightConfig.webServer)
    ? playwrightConfig.webServer[0]
    : playwrightConfig.webServer;
  if (!webServer) {
    throw new Error("playwright.config.ts must define a webServer");
  }
  return webServer.env ?? {};
}

describe("Playwright web server environment", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("provides a session secret the app accepts when SESSION_SECRET is empty, as in Dependabot runs", {
    timeout: MODULE_IMPORT_TIMEOUT_MS,
  }, async () => {
    vi.stubEnv("SESSION_SECRET", "");
    const { SESSION_SECRET: sessionSecret } = await loadWebServerEnv();

    const { app } = await import("./hono/app.js");
    const response = await app.fetch(
      new Request("http://localhost/health", { headers: { Origin: "http://localhost" } }),
      { SESSION_SECRET: sessionSecret, DB: {} as D1Database, CHAT_ROOM: {} as DurableObjectNamespace },
    );

    expect(response.status).toBe(200);
  });

  it("passes SESSION_SECRET through when it is set", {
    timeout: MODULE_IMPORT_TIMEOUT_MS,
  }, async () => {
    const sessionSecret = "configured-session-secret-with-more-than-32-chars";
    vi.stubEnv("SESSION_SECRET", sessionSecret);

    expect((await loadWebServerEnv()).SESSION_SECRET).toBe(sessionSecret);
  });
});
