import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import cloudflareConfig from "./cloudflare.config.js";

const SECRET_NAMES = ["SESSION_SECRET", "RESEND_API_KEY", "RESEND_FROM_EMAIL", "SITE_ADMIN_EMAIL"];

const { scripts: packageScripts } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as {
  scripts: Record<string, string>;
};

function evaluateWorker(mode: string | undefined) {
  return cloudflareConfig({ isPreview: false, mode }).worker;
}

function declaredSecretNames(env: Record<string, { type: string } | false | null | undefined>) {
  return Object.entries(env).flatMap(([name, binding]) => (binding && binding.type === "secret" ? [name] : []));
}

describe("cloudflare.config in production mode", () => {
  const worker = evaluateWorker("production");

  it("is served only from the custom domain", () => {
    expect(worker.name).toBe("mlack-production");
    expect(worker.domains).toEqual(["mlack.uk"]);
    expect(worker.workersDev).toBe(false);
  });

  it("runs the app in production", () => {
    expect(worker.env.NODE_ENV).toEqual({ type: "text", value: "production" });
  });

  it("leaves secrets to be managed on the deployed Worker", () => {
    expect(declaredSecretNames(worker.env)).toEqual([]);
  });

  it("targets the database used by the remote database scripts", () => {
    expect(packageScripts["db:migrate:prod"]).toContain(worker.env.DB.id);
    expect(packageScripts["db:seed:prod"]).toContain(worker.env.DB.id);
  });

  it("declares the ChatRoom Durable Object with SQLite storage", () => {
    expect(worker.exports.ChatRoom).toEqual({ type: "durable-object", storage: "sqlite" });
  });
});

describe.each([["development"], [undefined]])("cloudflare.config in %s mode", (mode) => {
  const worker = evaluateWorker(mode);

  it("is a separate Worker without a custom domain", () => {
    expect(worker.name).toBe("mlack");
    expect(worker.domains).toEqual([]);
    expect(worker.workersDev).toBe(true);
  });

  it("runs the app in development", () => {
    expect(worker.env.NODE_ENV).toEqual({ type: "text", value: "development" });
  });

  it("declares every secret so that local development can read it", () => {
    expect(declaredSecretNames(worker.env)).toEqual(SECRET_NAMES);
  });

  it("targets the database used by the local database scripts", () => {
    expect(packageScripts["db:migrate"]).toContain(worker.env.DB.id);
    expect(packageScripts["db:seed"]).toContain(worker.env.DB.id);
  });
});
