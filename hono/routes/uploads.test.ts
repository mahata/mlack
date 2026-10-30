import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestApp } from "../testApp.js";

const GIB = 1024 * 1024 * 1024;
const authenticatedUser = { email: "test@example.com", name: "Test User" };

const mockPut = vi.fn();
const mockGet = vi.fn();

beforeEach(() => {
  mockPut.mockReset();
  mockGet.mockReset();
});

async function createUploadsApp(options: { authenticated?: boolean; seed?: string } = {}) {
  const testApp = createTestApp({
    authenticatedUser: options.authenticated === false ? null : authenticatedUser,
    env: { STORAGE: { put: mockPut, get: mockGet } as unknown as R2Bucket },
  });
  await testApp.db.exec(`
    INSERT INTO channel_members (channel_id, user_email) VALUES (1, 'test@example.com');
    INSERT INTO channels (id, name, created_by_email) VALUES (2, 'private', 'other@example.com');
    INSERT INTO direct_conversations (id, user1_email, user2_email) VALUES
      (5, 'bob@example.com', 'test@example.com'), (6, 'bob@example.com', 'carol@example.com');
    ${options.seed ?? ""}
  `);
  return testApp.app;
}

function usedStorageSql(channelBytes: number, dmBytes = 0) {
  return `
    INSERT INTO messages (content, user_email, channel_id, attachment_size) VALUES ('', 'test@example.com', 1, ${channelBytes});
    INSERT INTO direct_messages (content, user_email, conversation_id, attachment_size) VALUES ('', 'test@example.com', 5, ${dmBytes});
  `;
}

function upload(fields: { file?: File; channelId?: string; conversationId?: string }) {
  const formData = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    formData.append(name, value);
  }
  return new Request("http://localhost/api/upload", {
    method: "POST",
    body: formData,
    headers: { Origin: "http://localhost" },
  });
}

function createTestFile(name: string, type: string, sizeBytes: number): File {
  return new File([new ArrayBuffer(sizeBytes)], name, { type });
}

const photo = () => createTestFile("photo.jpg", "image/jpeg", 1024);

describe("Upload API endpoint", () => {
  it("should upload a valid image file to the channel scope", async () => {
    const app = await createUploadsApp();

    const response = await app.request(upload({ file: photo(), channelId: "1" }));

    expect(response.status).toBe(200);
    const body = (await response.json()) as { key: string; name: string; type: string; size: number };
    expect(body).toMatchObject({ name: "photo.jpg", type: "image/jpeg", size: 1024 });
    expect(body.key).toMatch(/^channels\/1\/\d+-[\w-]+\.jpg$/);
    expect(mockPut).toHaveBeenCalledOnce();
    const [putKey, , putOptions] = mockPut.mock.calls[0];
    expect(putKey).toBe(body.key);
    expect(putOptions).toEqual({ httpMetadata: { contentType: "image/jpeg" } });
  });

  it("should return 400 when no file is provided", async () => {
    const app = await createUploadsApp();

    const response = await app.request(upload({ channelId: "1" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "No file provided" });
    expect(mockPut).not.toHaveBeenCalled();
  });

  it("should return 400 when channelId is missing", async () => {
    const app = await createUploadsApp();

    const response = await app.request(upload({ file: photo() }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "channelId or conversationId is required" });
  });

  it("should return 415 for unsupported file type", async () => {
    const app = await createUploadsApp();

    const response = await app.request(
      upload({ file: createTestFile("document.pdf", "application/pdf", 1024), channelId: "1" }),
    );

    expect(response.status).toBe(415);
    expect(((await response.json()) as { error: string }).error).toContain("File type not allowed");
    expect(mockPut).not.toHaveBeenCalled();
  });

  it("should return 413 for files exceeding size limit", async () => {
    const app = await createUploadsApp();

    const response = await app.request(
      upload({ file: createTestFile("huge.jpg", "image/jpeg", 26 * 1024 * 1024), channelId: "1" }),
    );

    expect(response.status).toBe(413);
    expect(((await response.json()) as { error: string }).error).toContain("File too large");
  });

  it("should return 401 for unauthenticated user", async () => {
    const app = await createUploadsApp({ authenticated: false });

    const response = await app.request(upload({ file: photo(), channelId: "1" }));

    expect(response.status).toBe(401);
    expect(mockPut).not.toHaveBeenCalled();
  });

  it("should return 403 when user is not a channel member", async () => {
    const app = await createUploadsApp();

    const response = await app.request(upload({ file: photo(), channelId: "2" }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Not a member of this channel" });
    expect(mockPut).not.toHaveBeenCalled();
  });

  it("should return 404 when channel does not exist", async () => {
    const app = await createUploadsApp();

    const response = await app.request(upload({ file: photo(), channelId: "999" }));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Channel not found" });
  });

  it("should return 400 for non-positive channelId values", async () => {
    const app = await createUploadsApp();

    for (const invalidId of ["0", "-1", "1.5", "abc"]) {
      const response = await app.request(upload({ file: photo(), channelId: invalidId }));
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Invalid channelId" });
    }
  });

  it("should return 413 when upload would exceed storage quota", async () => {
    const app = await createUploadsApp({ seed: usedStorageSql(10 * GIB - 512) });

    const response = await app.request(upload({ file: photo(), channelId: "1" }));

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: "Storage quota exceeded. Maximum total upload size is 10 GB" });
    expect(mockPut).not.toHaveBeenCalled();
  });

  it("should allow upload when usage is exactly at boundary", async () => {
    const app = await createUploadsApp({ seed: usedStorageSql(10 * GIB - 1024) });

    const response = await app.request(upload({ file: photo(), channelId: "1" }));

    expect(response.status).toBe(200);
    expect(mockPut).toHaveBeenCalledOnce();
  });

  it("should account for both channel and DM usage in quota", async () => {
    const app = await createUploadsApp({ seed: usedStorageSql(6 * GIB, 4 * GIB) });

    const response = await app.request(upload({ file: photo(), channelId: "1" }));

    expect(response.status).toBe(413);
  });

  it("should use custom upload limit from feature flag", async () => {
    const app = await createUploadsApp({
      seed: `${usedStorageSql(10 * GIB)}
        INSERT INTO user_feature_flags (user_email, flag_key, flag_value, granted_by)
        VALUES ('test@example.com', 'maxTotalUploadBytes', '${20 * GIB}', 'admin@example.com');`,
    });

    const response = await app.request(upload({ file: photo(), channelId: "1" }));

    expect(response.status).toBe(200);
    expect(mockPut).toHaveBeenCalledOnce();
  });

  it("should store DM uploads under the dm scope", async () => {
    const app = await createUploadsApp();

    const response = await app.request(
      upload({ file: createTestFile("clip.mp4", "video/mp4", 2048), conversationId: "5" }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { key: string };
    expect(body.key).toMatch(/^dm\/5\/\d+-[\w-]+\.mp4$/);
    expect(mockPut.mock.calls[0][0]).toBe(body.key);
  });

  it("should return 404 for DM uploads by a non-participant", async () => {
    const app = await createUploadsApp();

    const response = await app.request(
      upload({ file: createTestFile("clip.mp4", "video/mp4", 2048), conversationId: "6" }),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Conversation not found" });
    expect(mockPut).not.toHaveBeenCalled();
  });
});

describe("File serving endpoint", () => {
  function storedFile(body: BodyInit, contentType: string) {
    return {
      body,
      size: 12,
      writeHttpMetadata: (headers: Headers) => headers.set("content-type", contentType),
    };
  }

  it("should return 401 for unauthenticated user", async () => {
    const app = await createUploadsApp({ authenticated: false });

    const response = await app.request("/api/files/channels/1/test.jpg");

    expect(response.status).toBe(401);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("should return 404 when user is not a channel member", async () => {
    const app = await createUploadsApp();

    const response = await app.request("/api/files/channels/2/test.jpg");

    expect(response.status).toBe(404);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("should return 404 when file does not exist", async () => {
    const app = await createUploadsApp();
    mockGet.mockResolvedValueOnce(null);

    const response = await app.request("/api/files/channels/1/nonexistent.jpg");

    expect(response.status).toBe(404);
  });

  it("should serve a channel file to a member", async () => {
    const app = await createUploadsApp();
    mockGet.mockResolvedValueOnce(storedFile("file-content", "image/jpeg"));

    const response = await app.request("/api/files/channels/1/test.jpg");

    expect(response.status).toBe(200);
    expect(mockGet).toHaveBeenCalledWith("channels/1/test.jpg");
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("cache-control")).toBe("private, max-age=31536000, immutable");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await response.text()).toBe("file-content");
  });

  it("should serve a DM file to a conversation participant", async () => {
    const app = await createUploadsApp();
    mockGet.mockResolvedValueOnce(storedFile("dm-file-content", "video/mp4"));

    const response = await app.request("/api/files/dm/5/clip.mp4");

    expect(response.status).toBe(200);
    expect(mockGet).toHaveBeenCalledWith("dm/5/clip.mp4");
    expect(await response.text()).toBe("dm-file-content");
  });

  it("should return 404 for a DM file when user is not a participant", async () => {
    const app = await createUploadsApp();

    const response = await app.request("/api/files/dm/6/clip.mp4");

    expect(response.status).toBe(404);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("should return 404 for malformed keys and keys outside the channels and dm scopes", async () => {
    const app = await createUploadsApp();

    for (const path of [
      "/api/files/default/1/test.jpg",
      "/api/files/channels/1/nested/test.jpg",
      "/api/files/channels/not-a-number/test.jpg",
      "/api/files/channels/0/test.jpg",
      "/api/files/channels/-1/test.jpg",
    ]) {
      const response = await app.request(path);
      expect(response.status).toBe(404);
    }
    expect(mockGet).not.toHaveBeenCalled();
  });
});
