import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUserNameByEmail, getUsersByEmails } from "./user.js";

const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockDb = {
  select: vi.fn(() => ({ from: mockFrom })),
} as never;

beforeEach(() => {
  vi.clearAllMocks();
  mockFrom.mockReturnValue({ where: mockWhere });
});

describe("getUserNameByEmail", () => {
  it("should return user name when found", async () => {
    mockWhere.mockResolvedValue([{ name: "Alice" }]);

    const result = await getUserNameByEmail(mockDb, "alice@example.com");

    expect(result).toBe("Alice");
  });

  it("should return null when user not found", async () => {
    mockWhere.mockResolvedValue([]);

    const result = await getUserNameByEmail(mockDb, "unknown@example.com");

    expect(result).toBeNull();
  });
});

describe("getUsersByEmails", () => {
  it("should return users matching the emails", async () => {
    const users = [
      { email: "a@example.com", name: "Alice" },
      { email: "b@example.com", name: "Bob" },
    ];
    mockWhere.mockResolvedValue(users);

    const result = await getUsersByEmails(mockDb, ["a@example.com", "b@example.com"]);

    expect(result).toEqual(users);
  });

  it("should return empty array for empty email list", async () => {
    const result = await getUsersByEmails(mockDb, []);

    expect(result).toEqual([]);
    expect(mockDb.select).not.toHaveBeenCalled();
  });
});
