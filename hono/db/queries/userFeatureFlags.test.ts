import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteUserFeatureFlag,
  getUserFeatureFlag,
  getUserFeatureFlags,
  setUserFeatureFlag,
} from "./userFeatureFlags.js";

const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockValues = vi.fn();
const mockOnConflictDoUpdate = vi.fn();
const mockDelete = vi.fn();
const mockReturning = vi.fn();

const mockDb = {
  select: vi.fn().mockReturnValue({ from: mockFrom }),
  insert: vi.fn().mockReturnValue({ values: mockValues }),
  delete: vi.fn().mockReturnValue({ where: mockWhere }),
} as never;

beforeEach(() => {
  vi.restoreAllMocks();
  mockDb.select.mockReturnValue({ from: mockFrom });
  mockFrom.mockReturnValue({ where: mockWhere });
  mockWhere.mockReset();

  mockDb.insert.mockReturnValue({ values: mockValues });
  mockValues.mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
  mockOnConflictDoUpdate.mockResolvedValue(undefined);

  mockDb.delete.mockReturnValue({ where: mockDelete });
  mockDelete.mockReturnValue({ returning: mockReturning });
  mockReturning.mockResolvedValue([]);
});

describe("getUserFeatureFlag", () => {
  it("should return the flag value when it exists", async () => {
    mockWhere.mockResolvedValueOnce([{ flagValue: "21474836480" }]);

    const result = await getUserFeatureFlag(mockDb, "user@example.com", "maxTotalUploadBytes");

    expect(result).toBe("21474836480");
    expect(mockDb.select).toHaveBeenCalledTimes(1);
  });

  it("should return null when the flag does not exist", async () => {
    mockWhere.mockResolvedValueOnce([]);

    const result = await getUserFeatureFlag(mockDb, "user@example.com", "maxTotalUploadBytes");

    expect(result).toBeNull();
  });
});

describe("getUserFeatureFlags", () => {
  it("should return all flags for a user", async () => {
    const flags = [
      {
        flagKey: "maxTotalUploadBytes",
        flagValue: "21474836480",
        grantedBy: "admin@example.com",
        createdAt: "2026-01-01",
      },
    ];
    mockWhere.mockResolvedValueOnce(flags);

    const result = await getUserFeatureFlags(mockDb, "user@example.com");

    expect(result).toEqual(flags);
  });

  it("should return empty array when user has no flags", async () => {
    mockWhere.mockResolvedValueOnce([]);

    const result = await getUserFeatureFlags(mockDb, "user@example.com");

    expect(result).toEqual([]);
  });
});

describe("setUserFeatureFlag", () => {
  it("should insert or update a flag", async () => {
    await setUserFeatureFlag(mockDb, "user@example.com", "maxTotalUploadBytes", "21474836480", "admin@example.com");

    expect(mockDb.insert).toHaveBeenCalledTimes(1);
    expect(mockValues).toHaveBeenCalledWith({
      userEmail: "user@example.com",
      flagKey: "maxTotalUploadBytes",
      flagValue: "21474836480",
      grantedBy: "admin@example.com",
    });
    expect(mockOnConflictDoUpdate).toHaveBeenCalledTimes(1);
  });
});

describe("deleteUserFeatureFlag", () => {
  it("should return true when a flag was deleted", async () => {
    mockReturning.mockResolvedValueOnce([{ id: 1 }]);

    const result = await deleteUserFeatureFlag(mockDb, "user@example.com", "maxTotalUploadBytes");

    expect(result).toBe(true);
  });

  it("should return false when the flag did not exist", async () => {
    mockReturning.mockResolvedValueOnce([]);

    const result = await deleteUserFeatureFlag(mockDb, "user@example.com", "maxTotalUploadBytes");

    expect(result).toBe(false);
  });
});
