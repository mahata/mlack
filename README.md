# mlack

![CI](https://github.com/mahata/mlack/workflows/CI/badge.svg)

A real-time Slack-like chat app built with Hono, TypeScript, and Cloudflare Workers.

## Features

- **Real-time Chat**: WebSocket-powered chat with instant messaging via Cloudflare Durable Objects
- **Channels**: Create, join, and leave channels. Messages are scoped to channels
- **Persistent Storage**: Messages stored in Cloudflare D1 (SQLite) and persist across sessions
- **Authentication**: Email/password registration with email verification (6-digit OTP)
- **WebSocket Hibernation**: Cost-efficient WebSocket management that hibernates idle connections
- **Health Check Endpoint**: `/health` endpoint for monitoring
- **TypeScript**: Full TypeScript with strict type checking
- **Testing**: Unit tests (Vitest) and E2E tests (Playwright)
- **Linting**: Biome for code quality and formatting

## Getting Started

### Prerequisites

- Node.js (`^24.22.0` or `^26.12.0`, as required by the `cf` CLI)
- pnpm (v10.34.9, pinned via `packageManager` in `package.json`)

### Installation

```bash
pnpm install
```

### Environment Configuration

`cf dev` reads secrets from `.dev.vars`. Copy the sample file and fill in your values:

```bash
cp .env.sample .dev.vars
```

Required variables in `.dev.vars`:

- `SESSION_SECRET`: A secure secret for signing session cookies (HS256 JWT)
- `RESEND_API_KEY`: API key from [Resend](https://resend.com/) for sending verification emails
- `RESEND_FROM_EMAIL`: Sender address for verification emails (e.g. `noreply@yourdomain.com`)

> **Note**: `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are only required in production. In local development (`NODE_ENV=development`), verification codes are logged to the `cf dev` console instead of sending real emails. `cf dev` also prints a "Missing required secrets" warning for every secret that is absent from `.dev.vars`; it is harmless for the secrets you don't need locally.

### Database Setup

mlack uses Cloudflare D1 (SQLite) with plain SQL queries. For local development, `cf` manages a local D1 instance automatically.

```bash
# Apply migrations to local D1
pnpm db:migrate

# Seed the #general channel
pnpm db:seed

# Create an empty migration file in hono/db/migrations, then write its SQL by hand
pnpm exec cf d1 migrations create <migration-name> --dir hono/db/migrations

# Query the local database
pnpm exec cf d1 raw 00000000-0000-4000-8000-000000000000 --local --persist-to .wrangler/state --sql "SELECT email, name FROM users"
```

`cf d1` addresses databases by ID. The local database uses the placeholder ID `00000000-0000-4000-8000-000000000000` from `cloudflare.config.ts`, and `--persist-to .wrangler/state` points `cf d1` at the state used by `cf dev`.

### Development

```bash
# Start development server (cf dev)
pnpm dev

# Compile the client scripts into public/static and type-check everything
pnpm build

# Type-check only (no emit)
pnpm build:check

# Run unit tests in watch mode
pnpm test

# Run unit tests once
pnpm test:run

# Run E2E tests
pnpm test:e2e

# Lint code
pnpm lint

# Lint and auto-fix
pnpm lint:fix
```

## Deploying to Cloudflare

### First-time Setup

1. **Authenticate with Cloudflare**:

   ```bash
   pnpm exec cf auth login
   ```

2. **Create the D1 database**:

   ```bash
   pnpm exec cf d1 create --name mlack-db
   ```

   Copy the database ID from the output into `PRODUCTION_DATABASE_ID` in `cloudflare.config.ts`, and into the `db:migrate:prod` and `db:seed:prod` scripts in `package.json`.

3. **Apply migrations to the remote database**:

   ```bash
   pnpm db:migrate:prod
   ```

4. **Seed the remote database**:

   ```bash
   pnpm db:seed:prod
   ```

5. **Deploy**:

   ```bash
   pnpm run deploy
   ```

6. **Set production secrets** (secrets belong to an existing Worker, so set them after the first deploy; later deploys leave them untouched):

   ```bash
   pnpm exec cf workers secrets update SESSION_SECRET --worker mlack-production --type secret_text --text "<value>"
   pnpm exec cf workers secrets update RESEND_API_KEY --worker mlack-production --type secret_text --text "<value>"
   pnpm exec cf workers secrets update RESEND_FROM_EMAIL --worker mlack-production --type secret_text --text "<value>"
   ```

   The app responds with errors until `SESSION_SECRET` is set. For `RESEND_API_KEY`, create an API key at [Resend](https://resend.com/). For `RESEND_FROM_EMAIL`, use a verified domain in your Resend account (e.g. `noreply@yourdomain.com`).

### Automated Deployment (CI/CD)

Production deployments are automated via GitHub Actions. Pushing to the `prod` branch triggers the deployment pipeline defined in `.github/workflows/deploy.yml`.

**Pipeline overview:**

1. **`ci` job** — Runs the CI workflow (`.github/workflows/ci.yml`): unit tests, linter and build, plus Playwright E2E tests in parallel
2. **`deploy` job** — Applies D1 migrations and deploys to Cloudflare Workers (only runs after `ci` passes)

**Typical workflow:**

```bash
# Merge main into prod to trigger a deployment
git checkout prod
git merge main
git push origin prod
```

**Required GitHub secrets:**

The deploy job requires two repository secrets. Add them under **Settings > Secrets and variables > Actions > New repository secret**:

1. **`CLOUDFLARE_API_TOKEN`** — Create a token in the [Cloudflare dashboard](https://dash.cloudflare.com/profile/api-tokens) using the **"Edit Cloudflare Workers"** template, then add **D1 Edit** permission to it. The template includes Workers Scripts Write, Account Settings Read, User Memberships Read, and other permissions the `cf` CLI needs.
2. **`CLOUDFLARE_ACCOUNT_ID`** — Your Cloudflare account ID. Find it on the [Workers & Pages overview page](https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/) in the right sidebar.

The E2E job reuses the existing `SESSION_SECRET` secret already configured for CI.

### Manual Deployment

You can still deploy manually if needed:

```bash
pnpm run deploy
```

If you've added new database migrations, apply them before deploying:

```bash
pnpm db:migrate:prod
```

## Project Structure

```
mlack/
├── e2e/                    # Playwright E2E tests
├── hono/                   # Application source
│   ├── auth/               # Password hashing, email verification utilities
│   ├── components/         # Server-rendered JSX pages
│   ├── db/                 # SQL migrations, seed data, shared queries
│   ├── durableObjects/     # Cloudflare Durable Objects
│   │   └── ChatRoom.ts     # WebSocket server with hibernation
│   ├── routes/             # Route handlers
│   ├── static/             # Client-side TypeScript (compiled into public/static)
│   ├── app.tsx             # Middleware and route registration
│   ├── index.ts            # Entry point (exports app + Durable Objects)
│   ├── testApp.ts          # Test helpers (bindings, signed session cookies)
│   └── types.ts            # Shared types (User, Bindings, Variables)
├── public/                 # Static assets served by Workers
│   ├── components/         # Page stylesheets
│   └── static/             # Compiled client scripts (generated, not committed)
├── cloudflare.config.ts    # Cloudflare Workers configuration (cf)
├── wrangler.config.ts      # Bundler configuration used by cf
├── package.json            # Dependencies and scripts
├── playwright.config.ts    # Playwright configuration
├── tsconfig.json           # TypeScript configuration
├── vitest.config.ts        # Vitest configuration
└── biome.json              # Biome linter/formatter configuration
```

## Technology Stack

- **Runtime**: [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- **Framework**: [Hono](https://hono.dev/)
- **WebSocket**: [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/) with WebSocket Hibernation API
- **Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite)
- **Language**: TypeScript
- **Testing**: [Vitest](https://vitest.dev/) for unit tests, [Playwright](https://playwright.dev/) for E2E tests
- **Linting**: [Biome](https://biomejs.dev/)
- **Package Manager**: pnpm

## API Endpoints

### GET /

Chat interface. Redirects to `/auth/login` if not authenticated.

### GET /health

Health check endpoint.

```json
{ "status": "ok", "message": "Service is running" }
```

### GET /api/messages?channelId=1

Retrieve message history for a channel (requires authentication).

### GET /api/channels/memberships

List the channels the user has joined (`myChannels`) and the rest (`otherChannels`) (requires authentication).

### POST /api/channels

Create a new channel (requires authentication).

### POST /api/channels/:id/join

Join a channel (requires authentication).

### POST /api/channels/:id/leave

Leave a channel (requires authentication).

### WebSocket /ws

Real-time messaging endpoint. Requires an authenticated session. Messages are routed through a Cloudflare Durable Object for reliable broadcasting across all connected clients.

## Testing

### Unit Tests

```bash
pnpm test        # Watch mode
pnpm test:run    # Single run
```

### E2E Tests

```bash
pnpm test:e2e
```

E2E tests verify the full application flow including authentication, chat interface rendering, real-time WebSocket messaging, and message persistence.
