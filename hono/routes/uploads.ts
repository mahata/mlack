import { Hono } from "hono";
import { getChannelById, getConversationForParticipant, isChannelMember } from "../db/queries.js";
import { parsePositiveInt } from "../helpers/parsePositiveInt.js";
import type { Env } from "../types.js";

const BYTES_PER_MB = 1024 * 1024;
const BYTES_PER_GB = 1024 * BYTES_PER_MB;

function formatUploadLimit(bytes: number): string {
  if (bytes >= BYTES_PER_GB) {
    const gb = bytes / BYTES_PER_GB;
    const rounded = Math.round(gb * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)} GB`;
  }
  return `${Math.ceil(bytes / BYTES_PER_MB)} MB`;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const MAX_TOTAL_UPLOAD_SIZE = 10 * 1024 * 1024 * 1024;

const FILE_EXTENSIONS_BY_TYPE = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/gif", "gif"],
  ["image/webp", "webp"],
  ["video/mp4", "mp4"],
  ["video/webm", "webm"],
]);

const FILES_PATH_PREFIX = "/api/files/";

const uploadsRoute = new Hono<Env>();

uploadsRoute.post("/api/upload", async (c) => {
  try {
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

    const ext = FILE_EXTENSIONS_BY_TYPE.get(file.type);
    if (!ext) {
      return c.json({ error: "File type not allowed. Supported: JPEG, PNG, GIF, WebP, MP4, WebM" }, 415);
    }

    const db = c.env.DB;
    let key: string;

    if (conversationIdParam) {
      const conversationId = parsePositiveInt(conversationIdParam);
      if (!conversationId) {
        return c.json({ error: "Invalid conversationId" }, 400);
      }

      const conversation = await getConversationForParticipant(db, conversationId, user.email);
      if (!conversation) {
        return c.json({ error: "Conversation not found" }, 404);
      }

      key = `dm/${conversationId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    } else {
      const channelId = parsePositiveInt(channelIdParam);
      if (!channelId) {
        return c.json({ error: "Invalid channelId" }, 400);
      }

      const channel = await getChannelById(db, channelId);
      if (!channel) {
        return c.json({ error: "Channel not found" }, 404);
      }

      const isMember = await isChannelMember(db, channelId, user.email);
      if (!isMember) {
        return c.json({ error: "Not a member of this channel" }, 403);
      }

      key = `channels/${channelId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    }

    const quota = await db
      .prepare(
        `SELECT
           (SELECT COALESCE(SUM(attachment_size), 0) FROM messages WHERE user_email = ?1)
             + (SELECT COALESCE(SUM(attachment_size), 0) FROM direct_messages WHERE user_email = ?1) AS usedBytes,
           (SELECT flag_value FROM user_feature_flags WHERE user_email = ?1 AND flag_key = 'maxTotalUploadBytes') AS customLimit`,
      )
      .bind(user.email)
      .first<{ usedBytes: number; customLimit: string | null }>();
    const effectiveLimit = parsePositiveInt(quota?.customLimit) ?? MAX_TOTAL_UPLOAD_SIZE;
    if ((quota?.usedBytes ?? 0) + file.size > effectiveLimit) {
      return c.json(
        { error: `Storage quota exceeded. Maximum total upload size is ${formatUploadLimit(effectiveLimit)}` },
        413,
      );
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

uploadsRoute.get(`${FILES_PATH_PREFIX}*`, async (c) => {
  try {
    const user = c.get("user");
    const key = c.req.path.slice(FILES_PATH_PREFIX.length);

    if (!key) {
      return c.json({ error: "File key is required" }, 400);
    }

    const [scope, scopeIdParam, fileName, ...extraParts] = key.split("/");
    const scopeId = parsePositiveInt(scopeIdParam);
    if (!scopeId || !fileName || extraParts.length > 0) {
      return c.json({ error: "File not found" }, 404);
    }

    const db = c.env.DB;

    if (scope === "dm") {
      const conversation = await getConversationForParticipant(db, scopeId, user.email);
      if (!conversation) {
        return c.json({ error: "File not found" }, 404);
      }
    } else if (scope === "channels") {
      const isMember = await isChannelMember(db, scopeId, user.email);
      if (!isMember) {
        return c.json({ error: "File not found" }, 404);
      }
    } else {
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
