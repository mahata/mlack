# AGENTS.md

Coding agent guide for the **mlack** repository — a real-time Slack-like chat app built with Hono, TypeScript, and PostgreSQL.

## Build / Lint / Test Commands

Package manager is **pnpm** (v10.12.4). Node 22.

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

## Project Structure

```
hono/
  index.ts              # Server entry point
  app.tsx               # App factory, middleware, route registration
  types.ts              # Shared types (User, Variables)
  testApp.ts            # Test helper — creates app with mock session
  auth/                 # Auth utilities (password hashing)
  components/           # Server-rendered JSX pages + CSS
  db/                   # Drizzle schema, connection, migrations
  routes/               # Route handlers
  static/               # Client-side TypeScript (compiled to JS)
e2e/                    # Playwright E2E tests
```

## Code Style

### Formatting (Biome)

- 2-space indentation, 120-character line width.
- Run `pnpm lint:fix` to auto-format. No ESLint or Prettier.
- Biome organizes imports automatically — do not manually sort them.

### Imports

- **Always use `.js` extensions** in local imports (ESM requirement):
  `import { auth } from "./routes/auth.js";`
- Use `import type` for type-only imports (`verbatimModuleSyntax` is enforced):
  `import type { User, Variables } from "../types.js";`
- Exception: E2E tests in `e2e/` do not use `.js` extensions (Playwright resolves them).

### Exports

- **Named exports only** — no default exports.

### Types and TypeScript

- Strict mode enabled. Avoid `any`.
- Use `type` aliases (not `interface`) for data structures.
- Hono app instances are typed with `Hono<{ Variables: Variables }>`.
- Session user is accessed via `session.get("user") as User | undefined`.

### Naming Conventions

| Kind                | Convention  | Examples                                    |
|---------------------|-------------|---------------------------------------------|
| Files (components)  | PascalCase  | `ChatPage.tsx`, `LoginPage.tsx`             |
| Files (other)       | camelCase   | `emailAuth.ts`, `password.ts`              |
| E2E specs           | kebab-case  | `app.spec.ts`, `database-persistence.spec.ts` |
| Unit tests          | `.test.ts`  | `health.test.ts`, `ChatPage.test.ts`       |
| Variables/functions | camelCase   | `createApp`, `hashPassword`, `wsUrl`        |
| Constants           | UPPER_SNAKE | `SALT_LENGTH`, `KEY_LENGTH`                 |
| Types               | PascalCase  | `User`, `Variables`, `AppOptions`           |
| JSX components      | PascalCase  | `ChatPage()`, `LoginPage()`                |
| Route instances     | camelCase   | `const auth = new Hono(...)` exported as `{ auth }` |

### Comments

Avoid code comments. Use descriptive variable and function names so the code is self-documenting.

### Error Handling

Route handlers follow this pattern:

```ts
routeHandler.get("/path", async (c) => {
  try {
    if (!input) {
      return c.json({ error: "Bad request" }, 400);
    }
    // logic
  } catch (error) {
    console.error("Descriptive context:", error);
    return c.json({ error: "User-facing message" }, 500);
    // or for HTML routes:
    // return c.html(`<!DOCTYPE html>${await Page("Error message")}`, 500);
  }
});
```

- API routes return `c.json({ error: "..." }, statusCode)`.
- HTML form routes re-render the page with an inline error message.
- Auth guards: check `session.get("user")`, return 401 or redirect to `/auth/login`.
- WebSocket errors are logged but do not stop message broadcast.

### JSX / Components

- Server-side only (Hono JSX, not React). No client-side JSX.
- Components are **async functions** returning full HTML documents (`<html>`, `<head>`, `<body>`).
- Render with: `c.html(\`<!DOCTYPE html>\${await PageComponent(args)}\`)`.
- Use `className` (not `class`), `htmlFor` (not `for`), `charSet` (not `charset`).

### CSS

- Plain CSS files co-located with components in `hono/components/`.
- Served as static assets via `/components/*.css`.

## Testing Patterns

### Unit Tests (Vitest)

- Co-locate test files next to implementation: `health.ts` / `health.test.ts`.
- Import from vitest explicitly: `import { describe, expect, it, vi } from "vitest"`.
- Use `describe`/`it` blocks (not `test`).
- Use `createTestApp()` from `hono/testApp.ts` for route tests — it injects mock session middleware:

  ```ts
  const { app } = createTestApp({
    authenticatedUser: { email: "test@example.com", name: "Test", picture: "pic.jpg" },
  });
  const response = await app.request("/path");
  ```

- Test HTTP via Hono's built-in `app.request()` — no supertest.

### E2E Tests (Playwright)

- Files in `e2e/` with `.spec.ts` extension.
- Use `loginWithMock(page)` helper for authentication.
- Selectors: CSS classes (`.user-email`) and IDs (`#messageInput`).

## Copilot CLI Reviews

After completing a task (not after every individual file edit), you must run:

```shell
copilot -p 'Review @path/to/file for security, efficiency, and readability. Suggest specific improvements.' --model gpt-5.4 -s
```

Replace `path/to/file` with the actual file path (for example, `hono/routes/health.ts`). Run this for each file that was created or modified during the task. If Copilot finds issues, refactor the code and repeat the review for the affected files.

## Git Conventions

- **Conventional Commits**: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, etc.
- Do not commit unless tests pass (both unit and E2E). Write tests alongside implementation.
- Delete code and files that become unnecessary after changes.
