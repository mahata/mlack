import { afterEach, describe, expect, it, vi } from "vitest";

const MODULE_IMPORT_TIMEOUT_MS = 15000;

async function loadWebServerCommand() {
  vi.resetModules();
  const { default: playwrightConfig } = await import("./playwright.config.js");
  const webServer = Array.isArray(playwrightConfig.webServer)
    ? playwrightConfig.webServer[0]
    : playwrightConfig.webServer;
  if (!webServer) {
    throw new Error("playwright.config.ts must define a webServer");
  }
  return webServer.command;
}

function readWranglerVariable(command: string, name: string) {
  const variable = command.match(new RegExp(`--var ${name}:(\\S*)`));
  if (!variable) {
    throw new Error(`${name} is not passed to wrangler`);
  }
  return variable[1];
}

describe("Playwright web server command", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("passes a session secret the app accepts when SESSION_SECRET is empty, as in Dependabot runs", {
    timeout: MODULE_IMPORT_TIMEOUT_MS,
  }, async () => {
    vi.stubEnv("SESSION_SECRET", "");
    const sessionSecret = readWranglerVariable(await loadWebServerCommand(), "SESSION_SECRET");

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

    expect(readWranglerVariable(await loadWebServerCommand(), "SESSION_SECRET")).toBe(sessionSecret);
  });
});
