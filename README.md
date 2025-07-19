# mlack

![CI](https://github.com/mahata/mlack/workflows/CI/badge.svg)

It's an experiment to create a slack-like app just by vibe coding with GitHub Copilot.

## Features

- **Real-time Chat**: WebSocket-powered chat interface with instant messaging
- **Persistent Message Storage**: Messages are stored in PostgreSQL database and persist across sessions
- **Root Page**: Interactive web interface with "Hello, world!" message and chat functionality
- **WebSocket Support**: `/ws` endpoint using `@hono/node-ws` for real-time communication
- **Message Broadcasting**: Messages are broadcasted to all connected clients in real-time
- **Message History**: Previous messages are loaded automatically when joining the chat
- **Health Check Endpoint**: A `/health` endpoint built with Hono framework that returns service status
- **TypeScript**: Full TypeScript support with strict type checking
- **Testing**: Comprehensive test suite using Vitest
- **Linting**: Biome for code quality and formatting

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm (package manager)
- PostgreSQL database (local or remote)

### Installation

```bash
# Install dependencies
pnpm install
```

### Environment Configuration

The application uses environment variables for configuration. Create a `.env` file in the project root for local development:

```bash
# Copy the sample environment file
cp .env.sample .env

# Edit .env with your desired values
# Example:
# PORT=3001
```

Available environment variables:
- `PORT`: Server port (default: 3000)
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: Your Google OAuth credentials
- `SESSION_SECRET`: A secure secret for session encryption
- Database settings: `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`

If no `.env` file exists, the application will use system environment variables or fall back to defaults.

### Database Setup

#### Option 1: Using Docker (Recommended for Development)

Start a PostgreSQL container:

```bash
docker run --name mlack-postgres \
  -e POSTGRES_PASSWORD=mysecretpassword \
  -p 5432:5432 \
  --rm postgres:17.5-bullseye
```

#### Option 2: Using Local PostgreSQL

Install PostgreSQL locally and create a database. Update your `.env` file with the appropriate connection details.

#### Running Database Migrations

After setting up PostgreSQL, run the database migrations:

```bash
# Generate migration files (if schema changes)
pnpm db:generate

# Apply migrations to database
pnpm db:migrate

# Optional: Open Drizzle Studio to view/edit data
pnpm db:studio
```

### Development

```bash
# Start development server
pnpm dev

# Build the project
pnpm build

# Run tests
pnpm test

# Run tests once
pnpm test:run

# Run E2E tests
pnpm test:e2e

# Lint code
pnpm lint

# Lint and fix code
pnpm lint:fix
```

### API Endpoints

#### GET /

Root page that displays the chat interface with:
- "Hello, world!" message
- Real-time chat functionality
- Message input and send button
- WebSocket connection status

#### GET /health

Health check endpoint that returns the service status.

**Response:**
```json
{
  "status": "ok",
  "message": "Service is running"
}
```

**Example:**
```bash
curl http://localhost:3000/health
```

#### GET /api/messages

API endpoint for retrieving chat message history (requires authentication):

**Response:**
```json
{
  "messages": [
    {
      "id": 1,
      "content": "Hello, world!",
      "userEmail": "user@example.com",
      "userName": "John Doe",
      "createdAt": "2023-12-01T10:00:00Z"
    }
  ]
}
```

**Example:**
```bash
curl http://localhost:3000/api/messages \
  -H "Cookie: session=your_session_cookie"
```

#### WebSocket /ws

WebSocket endpoint for real-time messaging:
- Accepts WebSocket connections
- Broadcasts messages to all connected clients
- Supports text message communication
- Messages are automatically saved to database

**Example:**
```javascript
const ws = new WebSocket('ws://localhost:3000/ws');
ws.onmessage = (event) => console.log('Received:', event.data);
ws.send('Hello, world!');
```

## Project Structure

```
mlack/
├── e2e/            # Playwright E2E tests
├── hono/           # Hono application
│   ├── app.ts      # Main application setup
│   ├── app.test.ts # Application tests
│   └── index.ts    # Server entry point
├── .env.sample     # Sample environment configuration
├── package.json    # Project dependencies and scripts
├── playwright.config.ts # Playwright configuration
├── tsconfig.json   # TypeScript configuration
├── vitest.config.ts # Vitest configuration
└── biome.json      # Biome configuration
```

## Technology Stack

- **Framework**: [Hono](https://hono.dev/) - Ultra-fast web framework
- **WebSocket**: [@hono/node-ws](https://github.com/honojs/middleware/tree/main/packages/node-ws) - WebSocket support for Node.js
- **Database**: PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/) - Type-safe SQL database toolkit
- **Migration**: [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview) - Database schema management and migrations
- **Runtime**: Node.js with [@hono/node-server](https://github.com/honojs/node-server)
- **Language**: TypeScript
- **Environment**: [dotenv](https://github.com/motdotla/dotenv) - Environment variable management
- **Testing**: Vitest for unit tests, Playwright for E2E tests
- **Linting**: Biome for code quality and formatting
- **Package Manager**: pnpm

## Testing

The project includes both unit tests and end-to-end (E2E) tests:

### Unit Tests
Unit tests are powered by [Vitest](https://vitest.dev/) and test individual components and functions:

```bash
# Run unit tests in watch mode
pnpm test

# Run unit tests once
pnpm test:run
```

### E2E Tests
E2E tests use [Playwright](https://playwright.dev/) to test the complete application flow:

```bash
# Run E2E tests
pnpm test:e2e
```

The E2E tests verify:
- The application renders correctly
- "Hello, world!" message is displayed
- Chat interface elements are present and functional
- Real-time WebSocket connectivity
- Message persistence in database across page refreshes

Test artifacts (screenshots, traces) are automatically saved on failure for debugging.
