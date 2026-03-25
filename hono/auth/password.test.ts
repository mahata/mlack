import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";

describe("Password hashing", () => {
  it("should hash a password and verify it correctly", async () => {
    const password = "mysecretpassword";
    const hash = await hashPassword(password);

    expect(hash).toContain(":");
    expect(hash).not.toBe(password);

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it("should reject an incorrect password", async () => {
    const password = "mysecretpassword";
    const hash = await hashPassword(password);

    const isValid = await verifyPassword("wrongpassword", hash);
    expect(isValid).toBe(false);
  });

  it("should produce different hashes for the same password", async () => {
    const password = "mysecretpassword";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2);

    // Both should still verify correctly
    expect(await verifyPassword(password, hash1)).toBe(true);
    expect(await verifyPassword(password, hash2)).toBe(true);
  });

  it("should return false for malformed stored hash", async () => {
    const isValid = await verifyPassword("password", "nocolon");
    expect(isValid).toBe(false);
  });
});
