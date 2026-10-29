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

# E2E tests (Playwright — requires running Postgres)
pnpm test:e2e                 # Run all E2E tests
npx playwright test e2e/app.spec.ts                # Run a single E2E file

# Database (Drizzle ORM)
pnpm db:generate              # Generate migration from schema changes
pnpm db:migrate               # Apply migrations
```

CI runs: `pnpm test:run` then `pnpm lint` then `pnpm build`. All three must pass.

Task completion order: `pnpm test:run` → `pnpm lint` → `pnpm build` → Copilot CLI review → commit.

### Types and TypeScript

- Strict mode enabled. Avoid `any`.
- Use `type` aliases (not `interface`) for data structures.
- Hono app instances are typed with `Hono<{ Variables: Variables }>`.
- Session user is accessed via `session.get("user") as User | undefined`.

### Comments

Avoid code comments. Use descriptive variable and function names so the code is self-documenting.

## Git Conventions

- **Conventional Commits**: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, etc.
- Do not commit unless tests pass (both unit and E2E). Write tests alongside implementation.
- Do not commit unless: tests pass, lint passes, build passes, **and** Copilot CLI reviews have been run for all modified files.
- Delete code and files that become unnecessary after changes.
