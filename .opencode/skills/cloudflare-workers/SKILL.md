---
name: cloudflare-workers
description: Load this skill when working on Cloudflare Workers, Durable Objects, D1 bindings, or wrangler configuration
---

# Cloudflare Workers Patterns for mlack

## Workers Entry Point

The app is served via a Cloudflare Worker. The entry point is `hono/index.ts` which exports a `fetch` handler (Hono app) and a Durable Object class for WebSocket chat.

## Bindings

Bindings are defined in `wrangler.toml` and typed in `hono/types.ts`. Access bindings through Hono's context:

```ts
const db = drizzle(c.env.DB); // D1 binding
```

## Durable Objects

- Used for real-time WebSocket chat
- Each chat room is a Durable Object instance
- WebSocket connections are managed via the Durable Object's `fetch` handler
- Use `state.getWebSockets()` and `state.acceptWebSocket()` for hibernation API

## D1 Database

- SQLite-based, accessed via Drizzle ORM
- Schema defined in `hono/db/schema.ts`
- Migrations in `hono/db/migrations/`
- Local dev uses `wrangler d1 ... --local`
- Production uses `wrangler d1 ... --remote --env production`

## Environment Variables & Secrets

- Non-secret config goes in `wrangler.toml` under `[vars]`
- Secrets are set via `wrangler secret put SECRET_NAME`
- Never hardcode secrets in source code
- Access via `c.env.SECRET_NAME` in route handlers

## Deployment

```bash
pnpm deploy  # Builds client + assets, then runs wrangler deploy --env production
```

## Common Pitfalls

1. **No Node.js APIs** — Workers use the Web API (fetch, Request, Response, crypto, etc.). No `fs`, `path`, `process`.
2. **Request size limits** — Workers have a 100MB request body limit (free plan: smaller).
3. **CPU time limits** — 30s for paid plan, 10ms for free. Durable Objects have 30s.
4. **D1 is SQLite** — No `BOOLEAN` type (use INTEGER 0/1), no native `DATETIME` (use TEXT ISO strings or INTEGER timestamps).
5. **Durable Object singleton** — Each ID maps to exactly one instance. Don't create unnecessary IDs.
