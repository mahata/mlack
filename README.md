# mlack

![CI](https://github.com/mahata/mlack/workflows/CI/badge.svg)

A real-time Slack-like chat app built with Hono, TypeScript, and Cloudflare Workers.

## Features

- **Real-time Chat**: WebSocket-powered chat with instant messaging via Cloudflare Durable Objects
- **Channels**: Create, join, and leave channels. Messages are scoped to channels
- **Persistent Storage**: Messages stored in Cloudflare D1 (SQLite) and persist across sessions
- **Authentication**: Google OAuth and email/password registration
- **WebSocket Hibernation**: Cost-efficient WebSocket management that hibernates idle connections
- **Health Check Endpoint**: `/health` endpoint for monitoring
- **TypeScript**: Full TypeScript with strict type checking
- **Testing**: Unit tests (Vitest) and E2E tests (Playwright)
- **Linting**: Biome for code quality and formatting

## Getting Started

### Prerequisites

- Node.js (v22 or higher)
- pnpm (v10.12.4)

### Installation

```bash
pnpm install
```

### Environment Configuration

Wrangler dev reads secrets from `.dev.vars`. Copy the sample file and fill in your values:

```bash
cp .env.sample .dev.vars
```

Required variables in `.dev.vars`:

- `SESSION_SECRET`: A secure secret for session encryption
- `GOOGLE_ID`: Google OAuth client ID
- `GOOGLE_SECRET`: Google OAuth client secret
- `GOOGLE_REDIRECT_URI`: Google OAuth redirect URI (e.g. `http://localhost:8787/auth/google`)
- `E2E_GMAIL_ACCOUNT`: Gmail account for E2E testing

### Database Setup

mlack uses Cloudflare D1 (SQLite) via Drizzle ORM. For local development, wrangler manages a local D1 instance automatically.

```bash
# Apply migrations to local D1
pnpm db:migrate

# Seed the #general channel
pnpm db:seed

# Generate new migration files after schema changes
pnpm db:generate

# Open Drizzle Studio to view/edit data
pnpm db:studio
```

### Development

```bash
# Start development server (wrangler dev)
pnpm dev

# Build the project
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
   npx wrangler login
   ```

2. **Create the D1 database**:

   ```bash
   npx wrangler d1 create mlack-db
   ```

   Copy the `database_id` from the output and update `wrangler.toml`:

   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "mlack-db"
   database_id = "<YOUR_DATABASE_ID>"
   ```

3. **Apply migrations to the remote database**:

   ```bash
   pnpm db:migrate:prod
   ```

4. **Seed the remote database**:

   ```bash
   pnpm db:seed:prod
   ```

5. **Set production secrets**:

   ```bash
   npx wrangler secret put SESSION_SECRET -e production
   npx wrangler secret put GOOGLE_ID -e production
   npx wrangler secret put GOOGLE_SECRET -e production
   npx wrangler secret put GOOGLE_REDIRECT_URI -e production
   ```

   For `GOOGLE_REDIRECT_URI`, use your production URL (e.g. `https://mlack.<your-subdomain>.workers.dev/auth/google`). Make sure this URL is also registered in the Google Cloud Console.

6. **Deploy**:

   ```bash
   pnpm deploy
   ```

### Subsequent Deployments

After the initial setup, deploy with:

```bash
pnpm deploy
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
│   ├── auth/               # Password hashing utilities
│   ├── components/         # Server-rendered JSX pages + CSS
│   ├── db/                 # Drizzle schema, connection, migrations
│   ├── durableObjects/     # Cloudflare Durable Objects
│   │   └── ChatRoom.ts     # WebSocket server with hibernation
│   ├── routes/             # Route handlers
│   ├── static/             # Client-side TypeScript
│   ├── app.tsx             # App factory, middleware, route registration
│   ├── index.ts            # Entry point (exports app + Durable Objects)
│   ├── testApp.ts          # Test helper with mock session
│   └── types.ts            # Shared types (User, Bindings, Variables)
├── wrangler.toml           # Cloudflare Workers configuration
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
- **Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite) with [Drizzle ORM](https://orm.drizzle.team/)
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

### GET /api/channels

List all channels (requires authentication).

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
