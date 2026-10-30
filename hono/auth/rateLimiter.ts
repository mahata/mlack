import type { Context, MiddlewareHandler } from "hono";
import type { Env } from "../types.js";

type RateLimitOptions = {
  windowMs: number;
  maxRequests: number;
  onLimitExceeded: (c: Context<Env>) => Response | Promise<Response>;
};

export const MAX_TRACKED_CLIENTS = 10_000;

export function createRateLimiter({
  windowMs,
  maxRequests,
  onLimitExceeded,
}: RateLimitOptions): MiddlewareHandler<Env> {
  const windowsByClient = new Map<string, { count: number; resetsAt: number }>();

  return async (c, next) => {
    const now = Date.now();
    const client = c.req.header("cf-connecting-ip") ?? "unknown";
    const existingWindow = windowsByClient.get(client);
    if (!existingWindow && windowsByClient.size >= MAX_TRACKED_CLIENTS) {
      for (const [trackedClient, window] of windowsByClient) {
        if (window.resetsAt <= now) windowsByClient.delete(trackedClient);
      }
      if (windowsByClient.size >= MAX_TRACKED_CLIENTS) {
        const [oldestTrackedClient] = windowsByClient.keys();
        windowsByClient.delete(oldestTrackedClient);
      }
    }

    const window =
      existingWindow && existingWindow.resetsAt > now ? existingWindow : { count: 0, resetsAt: now + windowMs };
    if (window.count >= maxRequests) {
      return onLimitExceeded(c);
    }

    window.count += 1;
    windowsByClient.set(client, window);
    await next();
  };
}
