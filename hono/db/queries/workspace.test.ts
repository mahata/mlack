import { beforeEach, describe, expect, it, vi } from "vitest";
import { getWorkspaceMember } from "./workspace.js";

const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockDb = {
  select: vi.fn(() => ({ from: mockFrom })),
} as never;

beforeEach(() => {
  vi.clearAllMocks();
  mockFrom.mockReturnValue({ where: mockWhere });
});

describe("getWorkspaceMember", () => {
  it("should return member when found", async () => {
    const member = { id: 1, workspaceId: 1, userEmail: "user@example.com", role: "member", joinedAt: "2025-01-01" };
    mockWhere.mockResolvedValue([member]);

    const result = await getWorkspaceMember(mockDb, 1, "user@example.com");

    expect(result).toEqual(member);
  });

  it("should return null when member not found", async () => {
    mockWhere.mockResolvedValue([]);

    const result = await getWorkspaceMember(mockDb, 1, "stranger@example.com");

    expect(result).toBeNull();
  });
});
