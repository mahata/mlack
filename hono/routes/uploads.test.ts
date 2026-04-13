import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestApp } from "../testApp.js";

const mockSelect = vi.fn();
const mockPut = vi.fn();
const mockGet = vi.fn();

beforeEach(() => {
  mockSelect.mockReset();
  mockPut.mockReset();
  mockGet.mockReset();
});

vi.mock("../db/index.js", () => ({
  getDb: () => ({
    select: (...args: unknown[]) => mockSelect(...args),
  }),
  messages: { channelId: "channel_id", createdAt: "created_at" },
  channels: { id: "id", workspaceId: "workspace_id" },
  channelMembers: { channelId: "channel_id", userEmail: "user_email" },
  workspaces: { id: "id", slug: "slug" },
  workspaceMembers: { workspaceId: "workspace_id", userEmail: "user_email" },
}));

const authenticatedUser = { email: "test@example.com", name: "Test User", picture: "test.jpg" };

const mockWorkspace = { id: 1, name: "Default", slug: "default", createdByEmail: "system", createdAt: "2025-01-01" };
const mockWorkspaceMember = {
  id: 1,
  workspaceId: 1,
  userEmail: "test@example.com",
  role: "member",
  joinedAt: "2025-01-01",
};

function createStorageMock() {
  return { put: mockPut, get: mockGet } as unknown as R2Bucket;
}

function setupWorkspaceMocks() {
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([mockWorkspace]),
    }),
  });
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([mockWorkspaceMember]),
    }),
  });
}

function setupChannelMocks() {
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ id: 1, name: "general", workspaceId: 1 }]),
    }),
  });
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ id: 1, channelId: 1, userEmail: "test@example.com" }]),
    }),
  });
}

function setupQuotaMocks(channelUsageBytes = 0, dmUsageBytes = 0) {
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ total: channelUsageBytes }]),
    }),
  });
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ total: dmUsageBytes }]),
    }),
  });
}

function createTestFile(name: string, type: string, sizeBytes: number): File {
  const buffer = new ArrayBuffer(sizeBytes);
  return new File([buffer], name, { type });
}

function createUploadRequest(file: File, channelId: string): Request {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("channelId", channelId);
  return new Request("http://localhost/w/default/api/upload", {
    method: "POST",
    body: formData,
    headers: { Origin: "http://localhost" },
  });
}

describe("Upload API endpoint", () => {
  it("should upload a valid image file", async () => {
    setupWorkspaceMocks();
    setupChannelMocks();
    setupQuotaMocks();

    mockPut.mockResolvedValueOnce({ key: "default/1/test.jpg" });

    const { app } = createTestApp({ authenticatedUser, storageMock: createStorageMock() });

    const file = createTestFile("photo.jpg", "image/jpeg", 1024);
    const request = createUploadRequest(file, "1");
    const response = await app.request(request);

    expect(response.status).toBe(200);
    const body = (await response.json()) as { key: string; name: string; type: string; size: number };
    expect(body.name).toBe("photo.jpg");
    expect(body.type).toBe("image/jpeg");
    expect(body.size).toBe(1024);
    expect(body.key).toMatch(/^default\/1\/\d+-[\w-]+\.jpg$/);

    expect(mockPut).toHaveBeenCalledOnce();
    const [putKey, , putOptions] = mockPut.mock.calls[0];
    expect(putKey).toMatch(/^default\/1\/\d+-[\w-]+\.jpg$/);
    expect(putOptions).toEqual({ httpMetadata: { contentType: "image/jpeg" } });
  });

  it("should return 400 when no file is provided", async () => {
    setupWorkspaceMocks();

    const { app } = createTestApp({ authenticatedUser, storageMock: createStorageMock() });
    const formData = new FormData();
    formData.append("channelId", "1");

    const request = new Request("http://localhost/w/default/api/upload", {
      method: "POST",
      body: formData,
      headers: { Origin: "http://localhost" },
    });
    const response = await app.request(request);
    expect(response.status).toBe(400);

    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("No file provided");
    expect(mockPut).not.toHaveBeenCalled();
  });

  it("should return 400 when channelId is missing", async () => {
    setupWorkspaceMocks();

    const { app } = createTestApp({ authenticatedUser, storageMock: createStorageMock() });
    const file = createTestFile("photo.jpg", "image/jpeg", 1024);
    const formData = new FormData();
    formData.append("file", file);

    const request = new Request("http://localhost/w/default/api/upload", {
      method: "POST",
      body: formData,
      headers: { Origin: "http://localhost" },
    });
    const response = await app.request(request);
    expect(response.status).toBe(400);

    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("channelId or conversationId is required");
    expect(mockPut).not.toHaveBeenCalled();
  });

  it("should return 415 for unsupported file type", async () => {
    setupWorkspaceMocks();

    const { app } = createTestApp({ authenticatedUser, storageMock: createStorageMock() });
    const file = createTestFile("document.pdf", "application/pdf", 1024);
    const request = createUploadRequest(file, "1");
    const response = await app.request(request);
    expect(response.status).toBe(415);

    const body = (await response.json()) as { error: string };
    expect(body.error).toContain("File type not allowed");
    expect(mockPut).not.toHaveBeenCalled();
  });

  it("should return 413 for files exceeding size limit", async () => {
    setupWorkspaceMocks();

    const { app } = createTestApp({ authenticatedUser, storageMock: createStorageMock() });
    const file = createTestFile("huge.jpg", "image/jpeg", 26 * 1024 * 1024);
    const request = createUploadRequest(file, "1");
    const response = await app.request(request);
    expect(response.status).toBe(413);

    const body = (await response.json()) as { error: string };
    expect(body.error).toContain("File too large");
    expect(mockPut).not.toHaveBeenCalled();
  });

  it("should return 401 for unauthenticated user", async () => {
    const { app } = createTestApp({ authenticatedUser: null, storageMock: createStorageMock() });

    const file = createTestFile("photo.jpg", "image/jpeg", 1024);
    const request = createUploadRequest(file, "1");
    const response = await app.request(request);
    expect(response.status).toBe(401);

    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("Unauthorized");
    expect(mockPut).not.toHaveBeenCalled();
  });

  it("should return 403 when user is not a channel member", async () => {
    setupWorkspaceMocks();

    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 1, name: "general", workspaceId: 1 }]),
      }),
    });
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    const { app } = createTestApp({ authenticatedUser, storageMock: createStorageMock() });
    const file = createTestFile("photo.jpg", "image/jpeg", 1024);
    const request = createUploadRequest(file, "1");
    const response = await app.request(request);
    expect(response.status).toBe(403);

    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("Not a member of this channel");
    expect(mockPut).not.toHaveBeenCalled();
  });

  it("should return 404 when channel does not exist", async () => {
    setupWorkspaceMocks();

    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    const { app } = createTestApp({ authenticatedUser, storageMock: createStorageMock() });
    const file = createTestFile("photo.jpg", "image/jpeg", 1024);
    const request = createUploadRequest(file, "1");
    const response = await app.request(request);
    expect(response.status).toBe(404);

    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("Channel not found in this workspace");
    expect(mockPut).not.toHaveBeenCalled();
  });

  it("should return 400 for non-positive channelId values", async () => {
    setupWorkspaceMocks();
    const { app } = createTestApp({ authenticatedUser, storageMock: createStorageMock() });

    for (const invalidId of ["0", "-1", "1.5", "abc"]) {
      mockSelect.mockReset();
      setupWorkspaceMocks();
      const file = createTestFile("photo.jpg", "image/jpeg", 1024);
      const request = createUploadRequest(file, invalidId);
      const response = await app.request(request);
      expect(response.status).toBe(400);

      const body = (await response.json()) as { error: string };
      expect(body.error).toBe("Invalid channelId");
    }
  });

  it("should return 413 when upload would exceed storage quota", async () => {
    setupWorkspaceMocks();
    setupChannelMocks();
    const almostFullUsage = 10 * 1024 * 1024 * 1024 - 512;
    setupQuotaMocks(almostFullUsage, 0);

    const { app } = createTestApp({ authenticatedUser, storageMock: createStorageMock() });
    const file = createTestFile("photo.jpg", "image/jpeg", 1024);
    const request = createUploadRequest(file, "1");
    const response = await app.request(request);
    expect(response.status).toBe(413);

    const body = (await response.json()) as { error: string };
    expect(body.error).toContain("Storage quota exceeded");
    expect(mockPut).not.toHaveBeenCalled();
  });

  it("should allow upload when under storage quota", async () => {
    setupWorkspaceMocks();
    setupChannelMocks();
    setupQuotaMocks(5 * 1024 * 1024 * 1024, 0);

    mockPut.mockResolvedValueOnce({ key: "default/1/test.jpg" });

    const { app } = createTestApp({ authenticatedUser, storageMock: createStorageMock() });
    const file = createTestFile("photo.jpg", "image/jpeg", 1024);
    const request = createUploadRequest(file, "1");
    const response = await app.request(request);
    expect(response.status).toBe(200);
    expect(mockPut).toHaveBeenCalledOnce();
  });

  it("should allow upload when usage is exactly at boundary", async () => {
    setupWorkspaceMocks();
    setupChannelMocks();
    const maxMinusFileSize = 10 * 1024 * 1024 * 1024 - 1024;
    setupQuotaMocks(maxMinusFileSize, 0);

    mockPut.mockResolvedValueOnce({ key: "default/1/test.jpg" });

    const { app } = createTestApp({ authenticatedUser, storageMock: createStorageMock() });
    const file = createTestFile("photo.jpg", "image/jpeg", 1024);
    const request = createUploadRequest(file, "1");
    const response = await app.request(request);
    expect(response.status).toBe(200);
    expect(mockPut).toHaveBeenCalledOnce();
  });

  it("should account for both channel and DM usage in quota", async () => {
    setupWorkspaceMocks();
    setupChannelMocks();
    setupQuotaMocks(6 * 1024 * 1024 * 1024, 4 * 1024 * 1024 * 1024);

    const { app } = createTestApp({ authenticatedUser, storageMock: createStorageMock() });
    const file = createTestFile("photo.jpg", "image/jpeg", 1024);
    const request = createUploadRequest(file, "1");
    const response = await app.request(request);
    expect(response.status).toBe(413);

    const body = (await response.json()) as { error: string };
    expect(body.error).toContain("Storage quota exceeded");
    expect(mockPut).not.toHaveBeenCalled();
  });
});

describe("File serving endpoint", () => {
  it("should return 401 for unauthenticated user", async () => {
    const { app } = createTestApp({ authenticatedUser: null, storageMock: createStorageMock() });
    const response = await app.request("/w/default/api/files/default/1/test.jpg");
    expect(response.status).toBe(401);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("should return 404 when user is not a channel member", async () => {
    setupWorkspaceMocks();

    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    const { app } = createTestApp({ authenticatedUser, storageMock: createStorageMock() });
    const response = await app.request("/w/default/api/files/default/1/test.jpg");
    expect(response.status).toBe(404);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("should return 404 when file does not exist", async () => {
    setupWorkspaceMocks();

    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 1, channelId: 1, userEmail: "test@example.com" }]),
      }),
    });

    mockGet.mockResolvedValueOnce(null);

    const { app } = createTestApp({ authenticatedUser, storageMock: createStorageMock() });
    const response = await app.request("/w/default/api/files/default/1/nonexistent.jpg");
    expect(response.status).toBe(404);
  });

  it("should serve a file when it exists", async () => {
    setupWorkspaceMocks();

    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 1, channelId: 1, userEmail: "test@example.com" }]),
      }),
    });

    const fileBody = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("file-content"));
        controller.close();
      },
    });

    mockGet.mockResolvedValueOnce({
      body: fileBody,
      size: 12,
      writeHttpMetadata: (headers: Headers) => {
        headers.set("content-type", "image/jpeg");
      },
    });

    const { app } = createTestApp({ authenticatedUser, storageMock: createStorageMock() });
    const response = await app.request("/w/default/api/files/default/1/test.jpg");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("cache-control")).toBe("private, max-age=31536000, immutable");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await response.text()).toBe("file-content");
  });

  it("should return 404 for cross-workspace file key", async () => {
    setupWorkspaceMocks();
    const { app } = createTestApp({ authenticatedUser, storageMock: createStorageMock() });
    const response = await app.request("/w/default/api/files/other-workspace/1/test.jpg");
    expect(response.status).toBe(404);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("should return 404 for malformed channel id in file key", async () => {
    setupWorkspaceMocks();
    const { app } = createTestApp({ authenticatedUser, storageMock: createStorageMock() });

    for (const path of [
      "/w/default/api/files/default/not-a-number/test.jpg",
      "/w/default/api/files/default/0/test.jpg",
      "/w/default/api/files/default/-1/test.jpg",
    ]) {
      mockSelect.mockReset();
      setupWorkspaceMocks();
      const response = await app.request(path);
      expect(response.status).toBe(404);
      expect(mockGet).not.toHaveBeenCalled();
    }
  });
});
