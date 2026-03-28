import { describe, expect, it, vi } from "vitest";
import {
  createExpiresAt,
  generateVerificationCode,
  isExpired,
  sendVerificationEmail,
  VERIFICATION_EXPIRY_MS,
} from "./emailVerification.js";

describe("generateVerificationCode", () => {
  it("should return a 6-digit string", () => {
    const code = generateVerificationCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it("should pad codes shorter than 6 digits with leading zeros", () => {
    const code = generateVerificationCode();
    expect(code.length).toBe(6);
  });

  it("should generate different codes on subsequent calls", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 20; i++) {
      codes.add(generateVerificationCode());
    }
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe("createExpiresAt", () => {
  it("should return an ISO date string roughly 10 minutes in the future", () => {
    vi.useFakeTimers();
    const fixedNow = new Date("2020-01-01T00:00:00.000Z");
    vi.setSystemTime(fixedNow);
    const expiresAt = createExpiresAt();
    const ts = new Date(expiresAt).getTime();
    const expectedTs = fixedNow.getTime() + VERIFICATION_EXPIRY_MS;
    expect(ts).toBe(expectedTs);
    vi.useRealTimers();
  });
});

describe("isExpired", () => {
  it("should return false for a future date", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isExpired(future)).toBe(false);
  });

  it("should return true for a past date", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(isExpired(past)).toBe(true);
  });
});

describe("sendVerificationEmail", () => {
  it("should call Resend API with correct parameters", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    const result = await sendVerificationEmail("re_test_key", "noreply@example.com", "user@example.com", "123456");

    expect(result).toEqual({ success: true });
    expect(mockFetch).toHaveBeenCalledOnce();

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(options.method).toBe("POST");
    expect(options.headers.Authorization).toBe("Bearer re_test_key");

    const body = JSON.parse(options.body);
    expect(body.from).toBe("noreply@example.com");
    expect(body.to).toEqual(["user@example.com"]);
    expect(body.subject).toBe("MLack - Verify your email");
    expect(body.html).toContain("123456");

    vi.unstubAllGlobals();
  });

  it("should return error on API failure", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: () => Promise.resolve("validation error"),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await sendVerificationEmail("re_test_key", "noreply@example.com", "user@example.com", "123456");

    expect(result).toEqual({ success: false, error: "Failed to send verification email." });

    vi.unstubAllGlobals();
  });
});
