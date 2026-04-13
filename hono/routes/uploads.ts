import { Hono } from "hono";
import { getDb } from "../db/index.js";
import { getChannelInWorkspace, getConversationForParticipant, isChannelMember } from "../db/queries/index.js";
import { getWorkspace } from "../helpers/getWorkspace.js";
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
    const workspace = getWorkspace(c);
    const user = c.get("user");

    const formData = await c.req.formData();
    const file = formData.get("file");
    const channelIdParam = formData.get("channelId");
    const conversationIdParam = formData.get("conversationId");

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file provided" }, 400);
    }

    if (!channelIdParam && !conversationIdParam) {
      return c.json({ error: "channelId or conversationId is required" }, 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return c.json({ error: "File too large. Maximum size is 25 MB" }, 413);
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return c.json({ error: "File type not allowed. Supported: JPEG, PNG, GIF, WebP, MP4, WebM" }, 415);
    }

    const db = getDb(c.env.DB);
    const ext = getExtension(file.type);
    let key: string;

    if (conversationIdParam) {
      const conversationId = Number(conversationIdParam);
      if (!isPositiveInteger(conversationId)) {
        return c.json({ error: "Invalid conversationId" }, 400);
      }

      const conversation = await getConversationForParticipant(db, conversationId, user.email, workspace.id);
      if (!conversation) {
        return c.json({ error: "Conversation not found" }, 404);
      }

      key = `${workspace.slug}/dm/${conversationId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    } else {
      const channelId = Number(channelIdParam);
      if (!isPositiveInteger(channelId)) {
        return c.json({ error: "Invalid channelId" }, 400);
      }

      const channel = await getChannelInWorkspace(db, channelId, workspace.id);
      if (!channel) {
        return c.json({ error: "Channel not found in this workspace" }, 404);
      }

      const isMember = await isChannelMember(db, channelId, user.email);
      if (!isMember) {
        return c.json({ error: "Not a member of this channel" }, 403);
      }

      key = `${workspace.slug}/${channelId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    }

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
    const workspace = getWorkspace(c);
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

    const db = getDb(c.env.DB);

    if (keyParts[1] === "dm") {
      if (keyParts.length < 4) {
        return c.json({ error: "File not found" }, 404);
      }
      const conversationId = Number(keyParts[2]);
      if (!isPositiveInteger(conversationId)) {
        return c.json({ error: "File not found" }, 404);
      }

      const conversation = await getConversationForParticipant(db, conversationId, user.email, workspace.id);
      if (!conversation) {
        return c.json({ error: "File not found" }, 404);
      }
    } else {
      const channelId = Number(keyParts[1]);
      if (!isPositiveInteger(channelId)) {
        return c.json({ error: "File not found" }, 404);
      }

      const isMember = await isChannelMember(db, channelId, user.email);
      if (!isMember) {
        return c.json({ error: "File not found" }, 404);
      }
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
