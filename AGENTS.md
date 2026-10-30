# AGENTS.md

Coding agent guide for the **mlack** repository — a real-time Slack-like chat app built with Hono, TypeScript, and Cloudflare D1 (SQLite).

## Build / Lint / Test Commands

Package manager is **pnpm** (pinned via `packageManager` in `package.json`). JavaScript runtime is Node.js.

```bash
pnpm install                  # Install dependencies
pnpm build                    # Full build (client + server)
pnpm build:check              # Type-check only (no emit)
pnpm lint                     # Biome lint + format check
pnpm lint:fix                 # Biome auto-fix

# Unit tests (Vitest)
pnpm test                     # Watch mode
pnpm test:run                 # Single run (CI)
npx vitest run hono/routes/health.test.ts          # Run a single test file
npx vitest run -t "should return 401"              # Run tests matching a name

# E2E tests (Playwright, against `wrangler dev` with the local D1)
pnpm db:migrate && pnpm db:seed                    # Prepare the local D1 first
pnpm test:e2e                 # Run all E2E tests
npx playwright test e2e/app.spec.ts                # Run a single E2E file

# Database (Cloudflare D1, plain SQL)
pnpm db:migrate               # Apply migrations to the local D1
pnpm db:seed                  # Seed #general into the local D1
pnpm exec wrangler d1 migrations create mlack-db <name>   # New empty migration; write the SQL by hand
```

Unit tests run route handlers against an in-memory SQLite database (`node:sqlite`) that has the real migrations applied. Use `createTestApp()` from `hono/testApp.ts` and seed rows through its `db`.

CI runs: `pnpm test:run` then `pnpm lint` then `pnpm build`. All three must pass.

Task completion order: `pnpm test:run` → `pnpm lint` → `pnpm build` → Copilot CLI review → commit.

### Types and TypeScript

- Strict mode enabled. Avoid `any`.
- Use `type` aliases (not `interface`) for data structures.
- Hono app instances are typed with `Hono<Env>`.
- The session middleware (`hono/auth/session.ts`) stores the signed-in user in `c.get("user")`. Behind `requireUser`/`requireSiteAdmin` it is always set; elsewhere read it as `c.get("user") as User | undefined`. Use `startSession`/`endSession` to log users in and out.

### Comments

Avoid code comments. Use descriptive variable and function names so the code is self-documenting.

## Git Conventions

- **Conventional Commits**: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, etc.
- Do not commit unless tests pass (both unit and E2E). Write tests alongside implementation.
- Do not commit unless: tests pass, lint passes, build passes, **and** Copilot CLI reviews have been run for all modified files.
- Delete code and files that become unnecessary after changes.
