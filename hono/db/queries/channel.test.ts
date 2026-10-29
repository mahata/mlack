import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ensureGeneralChannelMembership,
  getChannelById,
  getChannelByName,
  getChannelMemberEmails,
  insertChannelMember,
  isChannelMember,
} from "./channel.js";

const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockOnConflictDoNothing = vi.fn();
const mockValues = vi.fn().mockReturnValue({ onConflictDoNothing: mockOnConflictDoNothing });
const mockDb = {
  select: vi.fn().mockReturnValue({ from: mockFrom }),
  insert: vi.fn().mockReturnValue({ values: mockValues }),
} as never;

beforeEach(() => {
  vi.restoreAllMocks();
  mockFrom.mockReturnValue({ where: mockWhere });
  mockValues.mockReturnValue({ onConflictDoNothing: mockOnConflictDoNothing });
  mockDb.select.mockReturnValue({ from: mockFrom });
  mockDb.insert.mockReturnValue({ values: mockValues });
  mockWhere.mockReset();
  mockOnConflictDoNothing.mockReset();
});

describe("isChannelMember", () => {
  it("should return true when membership exists", async () => {
    mockWhere.mockResolvedValue([{ id: 1, channelId: 1, userEmail: "user@example.com" }]);

    const result = await isChannelMember(mockDb, 1, "user@example.com");

    expect(result).toBe(true);
  });

  it("should return false when membership does not exist", async () => {
    mockWhere.mockResolvedValue([]);

    const result = await isChannelMember(mockDb, 1, "user@example.com");

    expect(result).toBe(false);
  });
});

describe("getChannelById", () => {
  it("should return channel when found", async () => {
    const channel = { id: 1, name: "general" };
    mockWhere.mockResolvedValue([channel]);

    const result = await getChannelById(mockDb, 1);

    expect(result).toEqual(channel);
  });

  it("should return null when not found", async () => {
    mockWhere.mockResolvedValue([]);

    const result = await getChannelById(mockDb, 999);

    expect(result).toBeNull();
  });
});

describe("getChannelByName", () => {
  it("should return channel when found by name", async () => {
    const channel = { id: 1, name: "general" };
    mockWhere.mockResolvedValue([channel]);

    const result = await getChannelByName(mockDb, "general");

    expect(result).toEqual(channel);
  });

  it("should return null when name not found", async () => {
    mockWhere.mockResolvedValue([]);

    const result = await getChannelByName(mockDb, "nonexistent");

    expect(result).toBeNull();
  });
});

describe("insertChannelMember", () => {
  it("should insert a channel member", async () => {
    mockOnConflictDoNothing.mockResolvedValue(undefined);

    await insertChannelMember(mockDb, 1, "user@example.com");

    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith({ channelId: 1, userEmail: "user@example.com" });
    expect(mockOnConflictDoNothing).toHaveBeenCalled();
  });
});

describe("getChannelMemberEmails", () => {
  it("should return list of member emails", async () => {
    mockWhere.mockResolvedValue([
      { id: 1, channelId: 1, userEmail: "a@example.com", joinedAt: "2025-01-01" },
      { id: 2, channelId: 1, userEmail: "b@example.com", joinedAt: "2025-01-01" },
    ]);

    const result = await getChannelMemberEmails(mockDb, 1);

    expect(result).toEqual(["a@example.com", "b@example.com"]);
  });

  it("should return empty array when no members", async () => {
    mockWhere.mockResolvedValue([]);

    const result = await getChannelMemberEmails(mockDb, 1);

    expect(result).toEqual([]);
  });
});

describe("ensureGeneralChannelMembership", () => {
  it("should join general channel when not already a member", async () => {
    mockWhere.mockResolvedValueOnce([{ id: 5, name: "general" }]);
    mockWhere.mockResolvedValueOnce([]);
    mockOnConflictDoNothing.mockResolvedValue(undefined);

    await ensureGeneralChannelMembership(mockDb, "user@example.com");

    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("should skip insert when already a member", async () => {
    mockWhere.mockResolvedValueOnce([{ id: 5, name: "general" }]);
    mockWhere.mockResolvedValueOnce([{ channelId: 5, userEmail: "user@example.com" }]);

    await ensureGeneralChannelMembership(mockDb, "user@example.com");

    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("should do nothing when general channel does not exist", async () => {
    mockWhere.mockResolvedValueOnce([]);

    await ensureGeneralChannelMembership(mockDb, "user@example.com");

    expect(mockDb.insert).not.toHaveBeenCalled();
  });
});
