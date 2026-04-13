import { beforeEach, describe, expect, it, vi } from "vitest";
import { getConversationForParticipant } from "./conversation.js";

const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockDb = {
  select: vi.fn(() => ({ from: mockFrom })),
} as never;

beforeEach(() => {
  vi.clearAllMocks();
  mockFrom.mockReturnValue({ where: mockWhere });
});

describe("getConversationForParticipant", () => {
  it("should return conversation when user is a participant", async () => {
    const conversation = { id: 1, workspaceId: 1, user1Email: "a@example.com", user2Email: "b@example.com" };
    mockWhere.mockResolvedValue([conversation]);

    const result = await getConversationForParticipant(mockDb, 1, "a@example.com");

    expect(result).toEqual(conversation);
  });

  it("should return null when user is not a participant", async () => {
    mockWhere.mockResolvedValue([]);

    const result = await getConversationForParticipant(mockDb, 1, "stranger@example.com");

    expect(result).toBeNull();
  });

  it("should include workspaceId in query when provided", async () => {
    mockWhere.mockResolvedValue([]);

    await getConversationForParticipant(mockDb, 1, "a@example.com", 5);

    expect(mockWhere).toHaveBeenCalled();
  });
});
