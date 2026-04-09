import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { channelMembers, channels, getDb } from "../db/index.js";
import type { Env } from "../types.js";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/webm"]);

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/webm": "webm",
  };
  return map[mimeType] || "bin";
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

const uploadsRoute = new Hono<Env>();

uploadsRoute.post("/w/:slug/api/upload", async (c) => {
  try {
    const workspace = c.get("workspace")!;
    const user = c.get("user");

    const formData = await c.req.formData();
    const file = formData.get("file");
    const channelIdParam = formData.get("channelId");

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file provided" }, 400);
    }

    if (!channelIdParam) {
      return c.json({ error: "channelId is required" }, 400);
    }

    const channelId = Number(channelIdParam);
    if (!isPositiveInteger(channelId)) {
      return c.json({ error: "Invalid channelId" }, 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return c.json({ error: "File too large. Maximum size is 25 MB" }, 413);
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return c.json({ error: "File type not allowed. Supported: JPEG, PNG, GIF, WebP, MP4, WebM" }, 415);
    }

    const db = getDb(c.env.DB);

    const channel = await db
      .select()
      .from(channels)
      .where(and(eq(channels.id, channelId), eq(channels.workspaceId, workspace.id)))
      .limit(1);
    if (channel.length === 0) {
      return c.json({ error: "Channel not found in this workspace" }, 404);
    }

    const membership = await db
      .select()
      .from(channelMembers)
      .where(and(eq(channelMembers.channelId, channelId), eq(channelMembers.userEmail, user.email)))
      .limit(1);
    if (membership.length === 0) {
      return c.json({ error: "Not a member of this channel" }, 403);
    }

    const ext = getExtension(file.type);
    const key = `${workspace.slug}/${channelId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    await c.env.STORAGE.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    return c.json({
      key,
      name: file.name,
      type: file.type,
      size: file.size,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return c.json({ error: "Failed to upload file" }, 500);
  }
});

uploadsRoute.get("/w/:slug/api/files/*", async (c) => {
  try {
    const workspace = c.get("workspace")!;
    const user = c.get("user");
    const fullPath = c.req.path;
    const prefix = `/w/${c.req.param("slug")}/api/files/`;
    const key = fullPath.slice(prefix.length);

    if (!key) {
      return c.json({ error: "File key is required" }, 400);
    }

    const keyParts = key.split("/");
    if (keyParts.length < 3 || keyParts[0] !== workspace.slug) {
      return c.json({ error: "File not found" }, 404);
    }

    const channelId = Number(keyParts[1]);
    if (!isPositiveInteger(channelId)) {
      return c.json({ error: "File not found" }, 404);
    }

    const db = getDb(c.env.DB);
    const membership = await db
      .select()
      .from(channelMembers)
      .where(and(eq(channelMembers.channelId, channelId), eq(channelMembers.userEmail, user.email)))
      .limit(1);
    if (membership.length === 0) {
      return c.json({ error: "File not found" }, 404);
    }

    const object = await c.env.STORAGE.get(key);
    if (!object) {
      return c.json({ error: "File not found" }, 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("cache-control", "private, max-age=31536000, immutable");
    headers.set("content-length", String(object.size));
    headers.set("x-content-type-options", "nosniff");

    return new Response(object.body, { headers });
  } catch (error) {
    console.error("Error serving file:", error);
    return c.json({ error: "Failed to serve file" }, 500);
  }
});

export { uploadsRoute };
