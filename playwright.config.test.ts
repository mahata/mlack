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

    const { createApp } = await import("./hono/app.js");
    const { app } = createApp();
    const response = await app.fetch(
      new Request("http://localhost/health", { headers: { Origin: "http://localhost" } }),
      { SESSION_SECRET: sessionSecret, DB: {} as D1Database, CHAT_ROOM: {} as DurableObjectNamespace } as never,
    );

    expect(response.status).toBe(200);
  });

  it("falls back to the default Gmail account when E2E_GMAIL_ACCOUNT is empty", {
    timeout: MODULE_IMPORT_TIMEOUT_MS,
  }, async () => {
    vi.stubEnv("E2E_GMAIL_ACCOUNT", "");

    expect(readWranglerVariable(await loadWebServerCommand(), "E2E_GMAIL_ACCOUNT")).toBe("test@example.com");
  });

  it("passes SESSION_SECRET and E2E_GMAIL_ACCOUNT through when they are set", {
    timeout: MODULE_IMPORT_TIMEOUT_MS,
  }, async () => {
    const sessionSecret = "configured-session-secret-with-more-than-32-chars";
    vi.stubEnv("SESSION_SECRET", sessionSecret);
    vi.stubEnv("E2E_GMAIL_ACCOUNT", "configured@example.com");
    const command = await loadWebServerCommand();

    expect(readWranglerVariable(command, "SESSION_SECRET")).toBe(sessionSecret);
    expect(readWranglerVariable(command, "E2E_GMAIL_ACCOUNT")).toBe("configured@example.com");
  });
});
