import { describe, expect, it } from "vitest";
import { createTestApp } from "../testApp.js";

const admin = { email: "admin@example.com", name: "Admin" };
const flagPath = "/site-admin/api/users/user%40example.com/flags";

async function createSiteAdminApp(user = admin) {
  const testApp = createTestApp({ authenticatedUser: user, env: { SITE_ADMIN_EMAIL: admin.email } });
  await testApp.db.exec(`
    INSERT INTO users (email, name, password_hash) VALUES ('user@example.com', 'Plain User', 'x');
    INSERT INTO user_feature_flags (user_email, flag_key, flag_value, granted_by)
    VALUES ('user@example.com', 'maxTotalUploadBytes', '1000', 'admin@example.com');
  `);
  return testApp;
}

function sendFlag(app: ReturnType<typeof createTestApp>["app"], method: string, flagKey: string, value?: unknown) {
  return app.request(`${flagPath}/${flagKey}`, {
    method,
    headers: { "Content-Type": "application/json", Origin: "http://localhost" },
    body: value === undefined ? undefined : JSON.stringify({ value }),
  });
}

function readFlagValue(db: D1Database) {
  return db
    .prepare("SELECT flag_value AS flagValue FROM user_feature_flags WHERE user_email = 'user@example.com'")
    .first<{ flagValue: string }>();
}

describe("Site admin routes", () => {
  it("should list users with their feature flags", async () => {
    const { app } = await createSiteAdminApp();

    const response = await app.request("/site-admin");

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("user@example.com");
    expect(html).toContain("maxTotalUploadBytes");
    expect(html).toContain("1000");
  });

  it("should reject users other than the site admin", async () => {
    const { app } = await createSiteAdminApp({ email: "user@example.com", name: "Plain User" });

    const response = await sendFlag(app, "DELETE", "maxTotalUploadBytes");

    expect(response.status).toBe(403);
  });

  it("should set and update a flag", async () => {
    const { app, db } = await createSiteAdminApp();

    const response = await sendFlag(app, "PUT", "maxTotalUploadBytes", " 2048 ");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: "Flag set" });
    expect(await readFlagValue(db)).toEqual({ flagValue: "2048" });
  });

  it.each([
    ["an unknown flag key", "unknownFlag", "1", "Unknown flag key: unknownFlag"],
    ["an inherited object key", "constructor", "1", "Unknown flag key: constructor"],
    ["a missing value", "maxTotalUploadBytes", "  ", "value is required and must be a non-empty string"],
    ["an invalid value", "maxTotalUploadBytes", "1.5", "Invalid value for maxTotalUploadBytes"],
  ])("should return 400 for %s", async (_case, flagKey, value, error) => {
    const { app } = await createSiteAdminApp();

    const response = await sendFlag(app, "PUT", flagKey, value);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error });
  });

  it("should return 404 when setting a flag for an unknown user", async () => {
    const { app } = await createSiteAdminApp();

    const response = await app.request("/site-admin/api/users/nobody%40example.com/flags/maxTotalUploadBytes", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Origin: "http://localhost" },
      body: JSON.stringify({ value: "1" }),
    });

    expect(response.status).toBe(404);
  });

  it("should remove a flag and return 404 when it is already gone", async () => {
    const { app, db } = await createSiteAdminApp();

    const firstResponse = await sendFlag(app, "DELETE", "maxTotalUploadBytes");
    const secondResponse = await sendFlag(app, "DELETE", "maxTotalUploadBytes");

    expect(firstResponse.status).toBe(200);
    expect(await readFlagValue(db)).toBeNull();
    expect(secondResponse.status).toBe(404);
  });
});
