import type { Context, MiddlewareHandler } from "hono";
import type { Env } from "../types.js";

type RateLimitOptions = {
  windowMs: number;
  maxRequests: number;
};

type RequestRecord = {
  timestamps: number[];
};

const stores = new Map<string, Map<string, RequestRecord>>();

function getStore(storeKey: string): Map<string, RequestRecord> {
  let store = stores.get(storeKey);
  if (!store) {
    store = new Map();
    stores.set(storeKey, store);
  }
  return store;
}

function getClientIp(c: Context<Env>): string {
  return c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export function createRateLimiter(storeKey: string, options: RateLimitOptions): MiddlewareHandler<Env> {
  if (options.windowMs <= 0 || options.maxRequests <= 0) {
    throw new Error("windowMs and maxRequests must be positive");
  }

  const { windowMs, maxRequests } = options;
  const store = getStore(storeKey);

  return async (c, next) => {
    const ip = getClientIp(c);
    const now = Date.now();

    const record = store.get(ip);
    if (!record) {
      store.set(ip, { timestamps: [now] });
      await next();
      return;
    }

    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

    if (record.timestamps.length >= maxRequests) {
      return c.json({ error: "Too many requests. Please try again later." }, 429);
    }

    record.timestamps.push(now);
    await next();
  };
}

export function _resetStores(): void {
  stores.clear();
}
