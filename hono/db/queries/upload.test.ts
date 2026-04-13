import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUserTotalUploadSize } from "./upload.js";

const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockDb = {
  select: vi.fn().mockReturnValue({ from: mockFrom }),
} as never;

beforeEach(() => {
  vi.restoreAllMocks();
  mockDb.select.mockReturnValue({ from: mockFrom });
  mockFrom.mockReturnValue({ where: mockWhere });
  mockWhere.mockReset();
});

describe("getUserTotalUploadSize", () => {
  it("should return 0 when user has no attachments", async () => {
    mockWhere.mockResolvedValueOnce([{ total: 0 }]);
    mockWhere.mockResolvedValueOnce([{ total: 0 }]);

    const result = await getUserTotalUploadSize(mockDb, "user@example.com");

    expect(result).toBe(0);
    expect(mockDb.select).toHaveBeenCalledTimes(2);
  });

  it("should sum attachment sizes from both messages and direct messages", async () => {
    mockWhere.mockResolvedValueOnce([{ total: 5000 }]);
    mockWhere.mockResolvedValueOnce([{ total: 3000 }]);

    const result = await getUserTotalUploadSize(mockDb, "user@example.com");

    expect(result).toBe(8000);
  });

  it("should handle null totals gracefully", async () => {
    mockWhere.mockResolvedValueOnce([{ total: null }]);
    mockWhere.mockResolvedValueOnce([{ total: null }]);

    const result = await getUserTotalUploadSize(mockDb, "user@example.com");

    expect(result).toBe(0);
  });

  it("should handle missing result rows", async () => {
    mockWhere.mockResolvedValueOnce([]);
    mockWhere.mockResolvedValueOnce([]);

    const result = await getUserTotalUploadSize(mockDb, "user@example.com");

    expect(result).toBe(0);
  });

  it("should propagate database errors", async () => {
    mockWhere.mockResolvedValueOnce([{ total: 1000 }]);
    mockWhere.mockRejectedValueOnce(new Error("DB connection failed"));

    await expect(getUserTotalUploadSize(mockDb, "user@example.com")).rejects.toThrow("DB connection failed");
  });
});
