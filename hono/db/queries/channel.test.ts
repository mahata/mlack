import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getChannelByNameInWorkspace,
  getChannelInWorkspace,
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

describe("getChannelInWorkspace", () => {
  it("should return channel when found", async () => {
    const channel = { id: 1, name: "general", workspaceId: 1 };
    mockWhere.mockResolvedValue([channel]);

    const result = await getChannelInWorkspace(mockDb, 1, 1);

    expect(result).toEqual(channel);
  });

  it("should return null when not found", async () => {
    mockWhere.mockResolvedValue([]);

    const result = await getChannelInWorkspace(mockDb, 999, 1);

    expect(result).toBeNull();
  });
});

describe("getChannelByNameInWorkspace", () => {
  it("should return channel when found by name", async () => {
    const channel = { id: 1, name: "general", workspaceId: 1 };
    mockWhere.mockResolvedValue([channel]);

    const result = await getChannelByNameInWorkspace(mockDb, 1, "general");

    expect(result).toEqual(channel);
  });

  it("should return null when name not found", async () => {
    mockWhere.mockResolvedValue([]);

    const result = await getChannelByNameInWorkspace(mockDb, 1, "nonexistent");

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
